from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_audit_id(prefix: str) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"{prefix}-{stamp}-{uuid4().hex[:8].upper()}"


def json_safe(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if isinstance(value, dict):
        return {key: json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [json_safe(item) for item in value]
    return value


class AuditStore:
    def __init__(self) -> None:
        self._predictions: list[dict[str, Any]] = []
        self._decisions: list[dict[str, Any]] = []
        self._table_client = None
        self.mode = "memory"
        self.table_name = os.getenv("AUDIT_TABLE_NAME", "ServicePriorityAudit")
        connection_string = os.getenv("AUDIT_STORAGE_CONNECTION_STRING") or os.getenv("AzureWebJobsStorage")

        if connection_string:
            try:
                from azure.data.tables import TableServiceClient

                service = TableServiceClient.from_connection_string(connection_string)
                service.create_table_if_not_exists(self.table_name)
                self._table_client = service.get_table_client(self.table_name)
                self.mode = "azure_table"
            except Exception:
                self._table_client = None
                self.mode = "memory"

    @property
    def durable(self) -> bool:
        return self._table_client is not None

    def record_prediction(
        self,
        payload: dict[str, Any],
        prediction: dict[str, Any],
        case_id: str | None = None,
    ) -> dict[str, Any]:
        record = {
            "audit_id": make_audit_id("PRED"),
            "record_type": "prediction",
            "recorded_at": utc_now(),
            "case_id": case_id or "ad-hoc",
            "service_type": payload.get("service_type"),
            "district": payload.get("district"),
            "deprivation_band": payload.get("deprivation_band"),
            "vulnerability_flag": bool(payload.get("vulnerability_flag")),
            "days_open": int(payload.get("days_open") or 0),
            "previous_contacts": int(payload.get("previous_contacts") or 0),
            "model_priority": prediction.get("priority"),
            "confidence": float(prediction.get("confidence") or 0.0),
            "model_version": prediction.get("model_version"),
            "human_review_required": bool(prediction.get("human_review_required")),
            "payload_json": json.dumps(json_safe(payload), sort_keys=True),
            "prediction_json": json.dumps(json_safe(prediction), sort_keys=True),
        }
        self._store(record)
        self._predictions.insert(0, record)
        return record

    def record_decision(
        self,
        case_id: str,
        payload: dict[str, Any],
        receipt: dict[str, Any],
    ) -> dict[str, Any]:
        prediction = payload.get("prediction") or {}
        case_request = payload.get("case_request") or {}
        record = {
            "audit_id": receipt["audit_id"],
            "record_type": "decision",
            "recorded_at": receipt["recorded_at"],
            "case_id": case_id,
            "service_type": case_request.get("service_type"),
            "district": case_request.get("district"),
            "final_priority": receipt["final_priority"],
            "model_priority": receipt["model_priority"],
            "confidence": float(prediction.get("confidence") or 0.0),
            "model_version": prediction.get("model_version"),
            "override_recorded": bool(receipt["override_recorded"]),
            "override_reason": payload.get("override_reason", ""),
            "action_taken": receipt.get("action_taken", ""),
            "officer_id": payload.get("officer_id", "demo.officer"),
            "payload_json": json.dumps(json_safe(payload), sort_keys=True),
            "receipt_json": json.dumps(json_safe(receipt), sort_keys=True),
        }
        self._store(record)
        self._decisions.insert(0, record)
        return record

    def list_predictions(self, limit: int = 50) -> list[dict[str, Any]]:
        records = self._query("prediction", limit)
        return records if records is not None else self._predictions[:limit]

    def list_decisions(self, limit: int = 50) -> list[dict[str, Any]]:
        records = self._query("decision", limit)
        return records if records is not None else self._decisions[:limit]

    def decision_receipts(self, limit: int = 20) -> list[dict[str, Any]]:
        receipts = []
        for record in self.list_decisions(limit):
            if record.get("receipt_json"):
                receipts.append(json.loads(str(record["receipt_json"])))
                continue
            receipts.append(
                {
                    "case_id": record["case_id"],
                    "status": "recorded",
                    "audit_id": record["audit_id"],
                    "recorded_at": record["recorded_at"],
                    "final_priority": record["final_priority"],
                    "model_priority": record["model_priority"],
                    "override_recorded": bool(record["override_recorded"]),
                    "action_taken": record.get("action_taken", ""),
                }
            )
        return receipts

    def summary(self) -> dict[str, Any]:
        predictions = self.list_predictions(200)
        decisions = self.list_decisions(200)
        scored = len(predictions)
        decision_count = len(decisions)
        overrides = sum(1 for item in decisions if item.get("override_recorded"))
        low_confidence = sum(1 for item in predictions if float(item.get("confidence") or 0) < 0.65)
        high_priority = sum(1 for item in predictions if item.get("model_priority") == "high")
        return {
            "store_mode": self.mode,
            "durable": self.durable,
            "table_name": self.table_name if self.durable else None,
            "prediction_records": scored,
            "decision_records": decision_count,
            "override_rate": round(overrides / decision_count, 4) if decision_count else 0.0,
            "low_confidence_rate": round(low_confidence / scored, 4) if scored else 0.0,
            "high_priority_rate": round(high_priority / scored, 4) if scored else 0.0,
            "latest_decision_at": decisions[0]["recorded_at"] if decisions else None,
        }

    def _store(self, record: dict[str, Any]) -> None:
        if self._table_client is None:
            return
        entity = {
            "PartitionKey": record["record_type"],
            "RowKey": record["audit_id"],
            **{key: value for key, value in record.items() if value is not None},
        }
        self._table_client.upsert_entity(entity=entity)

    def _query(self, record_type: str, limit: int) -> list[dict[str, Any]] | None:
        if self._table_client is None:
            return None
        entities = self._table_client.query_entities(
            f"PartitionKey eq '{record_type}'",
            results_per_page=limit,
        )
        records = []
        for entity in entities:
            record = dict(entity)
            record.pop("PartitionKey", None)
            record.pop("RowKey", None)
            records.append(record)
            if len(records) >= limit:
                break
        records.sort(key=lambda item: str(item.get("recorded_at", "")), reverse=True)
        return records[:limit]

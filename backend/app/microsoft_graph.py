from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

import httpx

from .schemas import EvidenceItem, M365SourceDetail, SourceItem


GRAPH_ROOT = "https://graph.microsoft.com/v1.0"
TOKEN_SCOPE = "https://graph.microsoft.com/.default"


@dataclass(frozen=True)
class GraphConfig:
    tenant_id: str
    client_id: str
    client_secret: str

    @classmethod
    def from_env(cls) -> "GraphConfig | None":
        tenant_id = os.getenv("M365_TENANT_ID", "").strip()
        client_id = os.getenv("M365_CLIENT_ID", "").strip()
        client_secret = os.getenv("M365_CLIENT_SECRET", "").strip()
        if not tenant_id or not client_id or not client_secret:
            return None
        return cls(tenant_id=tenant_id, client_id=client_id, client_secret=client_secret)


class MicrosoftGraphService:
    def __init__(self, config: GraphConfig | None = None) -> None:
        self.config = config if config is not None else GraphConfig.from_env()
        self.timeout = httpx.Timeout(10.0, connect=5.0)

    @property
    def configured(self) -> bool:
        return self.config is not None

    def fallback_source(self, item: SourceItem, message: str = "Microsoft 365 is not configured.") -> M365SourceDetail:
        return M365SourceDetail(
            id=item.id,
            title=item.title,
            app=item.app,
            source=item.app,
            status="not_configured" if not self.configured else "fallback",
            summary=item.summary,
            body=item.body,
            owner=item.owner,
            time=item.time,
            web_url=item.external_url or item.web_url,
            message=message,
        )

    def fallback_evidence(self, item: EvidenceItem, message: str = "Microsoft 365 is not configured.") -> M365SourceDetail:
        return M365SourceDetail(
            id=item.id,
            title=item.title,
            source=item.source,
            status="not_configured" if not self.configured else "fallback",
            summary=item.detail,
            body=item.detail,
            owner=item.source,
            web_url=item.web_url,
            content_type=item.content_type,
            image_url=item.image_url,
            message=message,
        )

    async def source_detail(self, item: SourceItem) -> M365SourceDetail:
        if not self.configured:
            return self.fallback_source(item)
        if not item.graph_source:
            return self.fallback_source(item, "This case source is local only and has no Microsoft 365 source type.")

        try:
            if item.graph_source == "outlook":
                return await self._outlook_message(item)
            if item.graph_source == "teams":
                return await self._teams_message(item)
            if item.graph_source in {"sharepoint", "onedrive"}:
                return await self._drive_item_source(item)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                return self.fallback_source(item, "Microsoft 365 item was not found or the app cannot access it.")
            return self.fallback_source(item, f"Microsoft Graph returned HTTP {exc.response.status_code}.")
        except Exception:
            return self.fallback_source(item, "Microsoft 365 content could not be loaded.")

        return self.fallback_source(item, "Unsupported Microsoft 365 source type.")

    async def evidence_detail(self, item: EvidenceItem) -> M365SourceDetail:
        if not self.configured:
            return self.fallback_evidence(item)
        if not item.graph_source:
            return self.fallback_evidence(item, "This evidence item is local only and has no Microsoft 365 source type.")

        try:
            if item.graph_source in {"sharepoint", "onedrive"}:
                return await self._drive_item_evidence(item)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                return self.fallback_evidence(item, "Microsoft 365 evidence was not found or the app cannot access it.")
            return self.fallback_evidence(item, f"Microsoft Graph returned HTTP {exc.response.status_code}.")
        except Exception:
            return self.fallback_evidence(item, "Microsoft 365 evidence could not be loaded.")

        return self.fallback_evidence(item, "Unsupported Microsoft 365 evidence type.")

    async def status(self) -> dict[str, object]:
        if not self.configured:
            return {
                "configured": False,
                "token": "missing_config",
                "checks": [],
            }

        checks: list[dict[str, object]] = []
        try:
            token = await self._token()
        except httpx.HTTPStatusError as exc:
            return {
                "configured": True,
                "token": "failed",
                "status_code": exc.response.status_code,
                "error": self._graph_error(exc.response),
                "checks": checks,
            }
        except Exception as exc:
            return {
                "configured": True,
                "token": "failed",
                "error": exc.__class__.__name__,
                "checks": checks,
            }

        probes = [
            ("organization", "/organization?$select=id,displayName"),
            ("sharepoint_root", "/sites/root?$select=id,displayName,webUrl"),
            ("users", "/users?$top=1&$select=id,displayName,userPrincipalName"),
            ("groups", "/groups?$top=1&$select=id,displayName,mail"),
            ("teams", "/teams?$top=1"),
        ]
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for label, path in probes:
                response = await client.get(f"{GRAPH_ROOT}{path}", headers={"Authorization": f"Bearer {token}"})
                entry: dict[str, object] = {"name": label, "status_code": response.status_code}
                if response.status_code >= 400:
                    entry["error"] = self._graph_error(response)
                else:
                    body = response.json()
                    entry["available"] = True
                    if isinstance(body.get("value"), list):
                        entry["count"] = len(body["value"])
                checks.append(entry)

        return {
            "configured": True,
            "token": "ok",
            "checks": checks,
        }

    async def file_content(self, drive_id: str, item_id: str) -> tuple[bytes, str, str]:
        token = await self._token()
        encoded_drive_id = quote(drive_id, safe="")
        encoded_item_id = quote(item_id, safe="")
        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            response = await client.get(
                f"{GRAPH_ROOT}/drives/{encoded_drive_id}/items/{encoded_item_id}/content",
                headers={"Authorization": f"Bearer {token}"},
            )
            response.raise_for_status()
            content_type = response.headers.get("content-type", "application/octet-stream")
            filename = response.headers.get("content-disposition", "")
            return response.content, content_type, filename

    async def _token(self) -> str:
        assert self.config is not None
        token_url = f"https://login.microsoftonline.com/{self.config.tenant_id}/oauth2/v2.0/token"
        data = {
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret,
            "scope": TOKEN_SCOPE,
            "grant_type": "client_credentials",
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(token_url, data=data)
            response.raise_for_status()
            return str(response.json()["access_token"])

    async def _get(self, path: str, params: dict[str, str] | None = None) -> dict[str, Any]:
        token = await self._token()
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{GRAPH_ROOT}{path}",
                headers={"Authorization": f"Bearer {token}"},
                params=params,
            )
            response.raise_for_status()
            return response.json()

    def _graph_error(self, response: httpx.Response) -> dict[str, object]:
        try:
            body = response.json()
        except Exception:
            return {"message": response.text[:200]}
        error = body.get("error", {})
        if not isinstance(error, dict):
            return {"message": str(body)[:200]}
        return {
            "code": error.get("code", ""),
            "message": error.get("message", ""),
        }

    async def _outlook_message(self, item: SourceItem) -> M365SourceDetail:
        if not item.mailbox or not item.graph_id:
            return self.fallback_source(item, "Showing the case email saved with this record. Live Outlook message details are not connected yet.")

        mailbox = quote(item.mailbox, safe="")
        message_id = quote(item.graph_id, safe="")
        data = await self._get(
            f"/users/{mailbox}/messages/{message_id}",
            params={"$select": "id,subject,body,bodyPreview,from,receivedDateTime,webLink"},
        )
        sender = data.get("from", {}).get("emailAddress", {}).get("name", item.owner)
        body = data.get("body", {}).get("content") or data.get("bodyPreview") or item.body

        return M365SourceDetail(
            id=item.id,
            title=data.get("subject") or item.title,
            app="Outlook",
            source="Outlook",
            status="live",
            summary=data.get("bodyPreview") or item.summary,
            body=body,
            owner=sender,
            time=data.get("receivedDateTime") or item.time,
            web_url=data.get("webLink") or item.external_url,
            content_type=data.get("body", {}).get("contentType", "text"),
        )

    async def _teams_message(self, item: SourceItem) -> M365SourceDetail:
        if item.chat_id and item.graph_id:
            chat_id = quote(item.chat_id, safe="")
            message_id = quote(item.graph_id, safe="")
            data = await self._get(f"/chats/{chat_id}/messages/{message_id}")
        elif item.team_id and item.channel_id and item.graph_id:
            team_id = quote(item.team_id, safe="")
            channel_id = quote(item.channel_id, safe="")
            message_id = quote(item.graph_id, safe="")
            data = await self._get(f"/teams/{team_id}/channels/{channel_id}/messages/{message_id}")
        else:
            return self.fallback_source(item, "Showing the case note saved with this record. Live Teams message details are not connected yet.")

        author = data.get("from", {}).get("user", {}).get("displayName", item.owner)
        body = data.get("body", {}).get("content") or item.body

        return M365SourceDetail(
            id=item.id,
            title=data.get("subject") or item.title,
            app="Teams",
            source="Teams",
            status="live",
            summary=item.summary,
            body=body,
            owner=author,
            time=data.get("createdDateTime") or item.time,
            web_url=data.get("webUrl") or item.external_url,
            content_type=data.get("body", {}).get("contentType", "html"),
        )

    async def _drive_item_source(self, item: SourceItem) -> M365SourceDetail:
        if not item.drive_id or not item.item_id:
            return self.fallback_source(item, "Showing the case file summary saved with this record. Live SharePoint file details are not connected yet.")

        drive_id = quote(item.drive_id, safe="")
        item_id = quote(item.item_id, safe="")
        data = await self._get(f"/drives/{drive_id}/items/{item_id}")

        return M365SourceDetail(
            id=item.id,
            title=data.get("name") or item.title,
            app="SharePoint" if item.graph_source == "sharepoint" else None,
            source="SharePoint" if item.graph_source == "sharepoint" else "OneDrive",
            status="live",
            summary=item.summary,
            body=item.body,
            owner=data.get("createdBy", {}).get("user", {}).get("displayName", item.owner),
            time=data.get("lastModifiedDateTime") or item.time,
            web_url=data.get("webUrl") or item.external_url,
            content_url=f"/m365/files/{drive_id}/items/{item_id}/content",
            preview_url=data.get("@microsoft.graph.downloadUrl", ""),
            content_type=data.get("file", {}).get("mimeType", ""),
        )

    async def _drive_item_evidence(self, item: EvidenceItem) -> M365SourceDetail:
        drive_id = item.drive_id or item.graph_id
        item_id = item.item_id
        if not drive_id or not item_id:
            return self.fallback_evidence(item, "Showing the evidence saved with this record. Live SharePoint file details are not connected yet.")

        encoded_drive_id = quote(drive_id, safe="")
        encoded_item_id = quote(item_id, safe="")
        data = await self._get(f"/drives/{encoded_drive_id}/items/{encoded_item_id}")
        mime_type = data.get("file", {}).get("mimeType", item.content_type)
        download_url = data.get("@microsoft.graph.downloadUrl", "")
        content_url = f"/m365/files/{encoded_drive_id}/items/{encoded_item_id}/content"

        return M365SourceDetail(
            id=item.id,
            title=data.get("name") or item.title,
            source="SharePoint" if item.graph_source == "sharepoint" else "OneDrive",
            status="live",
            summary=item.detail,
            body=item.detail,
            owner=data.get("createdBy", {}).get("user", {}).get("displayName", item.source),
            time=data.get("lastModifiedDateTime", ""),
            web_url=data.get("webUrl") or item.web_url,
            content_url=content_url,
            preview_url=download_url if mime_type.startswith("image/") else "",
            content_type=mime_type,
            image_url=content_url if mime_type.startswith("image/") else item.image_url,
        )

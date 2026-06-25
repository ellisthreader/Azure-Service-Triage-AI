# Microsoft 365 Integration

The case details UI can load source and evidence content from Microsoft 365 through Microsoft Graph. Without Microsoft credentials it stays in local fallback mode and shows the existing synthetic case content.

## Required Environment

Set these on the FastAPI backend:

```bash
M365_TENANT_ID="<entra-tenant-id>"
M365_CLIENT_ID="<app-registration-client-id>"
M365_CLIENT_SECRET="<client-secret>"
```

The backend uses Microsoft Graph client credentials and calls Graph server-side. The frontend never stores Graph secrets.

## Required Graph References

Each case source or evidence row can include Microsoft Graph reference fields.

This project supports a private local mapping file so you do not need to edit Python case data directly:

```text
/home/ellis/Desktop/AzureProject/m365-case-links.json
```

Start from:

```text
/home/ellis/Desktop/AzureProject/m365-case-links.example.json
```

The real `m365-case-links.json` file is git-ignored because it can contain real tenant item IDs.

Outlook message:

```json
{
  "graph_source": "outlook",
  "mailbox": "shared-mailbox@tenant.gov.uk",
  "graph_id": "<message-id>"
}
```

Teams message:

```json
{
  "graph_source": "teams",
  "team_id": "<team-id>",
  "channel_id": "<channel-id>",
  "graph_id": "<message-id>"
}
```

SharePoint or OneDrive file:

```json
{
  "graph_source": "sharepoint",
  "drive_id": "<document-library-drive-id>",
  "item_id": "<drive-item-id>"
}
```

## Backend Endpoints

```text
GET /cases/{case_id}/sources/{source_id}
GET /cases/{case_id}/evidence/{evidence_id}
GET /m365/status
GET /m365/missing-links
GET /m365/files/{drive_id}/items/{item_id}/content
```

These endpoints return normalized content for the frontend preview drawers. Status is `live` when Graph data was loaded, and `not_configured` or `fallback` when local case content is being shown.

`/m365/status` verifies whether the configured tenant/app can access Microsoft 365 services. A valid token alone is not enough; Teams, SharePoint, Outlook, users/groups, and file APIs also need the tenant service, app permissions, and admin consent.

`/m365/missing-links` lists which case sources/evidence items still need real Graph IDs in `m365-case-links.json`. The caseworker drawer stays user-friendly and shows saved case content while these links are incomplete.

`/m365/files/{drive_id}/items/{item_id}/content` proxies SharePoint/OneDrive file content through this backend so image/file previews can render inside the website instead of navigating the user away to Microsoft 365.

## In-site Preview Support

The website can render these inside the case drawer:

- Outlook and Teams message bodies returned by Graph.
- SharePoint/OneDrive images through the backend file proxy.
- PDF files through the backend file proxy in an iframe.
- Text-like files through the backend file proxy in an iframe.

Native Word, PowerPoint, and Excel rendering is not available from raw Graph bytes in a browser. For those files, choose one of these production approaches:

1. Use Microsoft Office for the web preview/embed link. This keeps the user inside the website visually, but the iframe is still served by Microsoft.
2. Add a server-side conversion service that converts Office files to PDF or images, then render the converted file through `/m365/files/.../content`.
3. Show metadata and a download/open fallback.

The current implementation avoids silently opening third-party apps. It renders supported content in the website and keeps Microsoft 365 links as fallback actions.

## Current Tenant Diagnostics

Use:

```text
GET /m365/status
```

If this reports missing SharePoint/Teams provisioning or insufficient privileges, the code cannot retrieve live content until the Microsoft tenant has the required services, Graph permissions, admin consent, and real item IDs.

## Permission Notes

Start with SharePoint/Drive evidence because it is the cleanest case evidence path. Outlook and Teams message access usually needs stricter admin consent and information governance review.

Use least-privilege Microsoft Graph permissions and audit source opens before production use.

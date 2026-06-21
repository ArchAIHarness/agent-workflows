---
name: doubao-video
version: 1.0.0
description: |
  Use when needing to generate videos with Doubao (豆包) Seedance / Seedream models via Volcengine Ark (火山方舟).
  Supports text-to-video and image-to-video: create generation tasks, query task status, list tasks, and cancel/delete tasks.
  Models: doubao-seedance-2.0, doubao-seedance-2.0-fast, doubao-seedance-1.5-pro, doubao-seedream-5.0-lite.
  Configure API_KEY in .doubao-video/.env before use.
---

# doubao-video

## Goal

Provide video generation capabilities using Doubao Seedance/Seedream models on Volcengine Ark. Users configure API credentials once, then the AI creates and tracks asynchronous video generation tasks.

## Configuration

API key must be set before first use:

```bash
# In project's .doubao-video/.env or ~/.doubao-video/.env
API_KEY=your_ark_api_key_here
```

Get the API Key from the Volcengine Ark console: https://console.volcengine.com/ark

The config file is auto-created on first tool call if missing.

### Models

Specify the target model via the `model` argument when creating a task.

| Model | Description |
|---|---|
| `doubao-seedance-2.0` | Seedance 2.0 video generation (default) |
| `doubao-seedance-2.0-fast` | Seedance 2.0 fast variant, lower latency |
| `doubao-seedance-1.5-pro` | Seedance 1.5 pro video generation |
| `doubao-seedream-5.0-lite` | Seedream 5.0 lite generation |

### API Endpoints (Volcengine Ark, Agent/Coding Plan)

| Action | Method | Endpoint |
|---|---|---|
| Create video task | `POST` | `https://ark.cn-beijing.volces.com/api/plan/v3/contents/generations/tasks` |
| Query video task | `GET` | `https://ark.cn-beijing.volces.com/api/plan/v3/contents/generations/tasks/{id}` |
| List video tasks | `GET` | `.../tasks?page_num={page_num}&page_size={page_size}&filter.status={status}&filter.task_ids={ids}&filter.model={model}` |
| Cancel/delete video task | `DELETE` | `https://ark.cn-beijing.volces.com/api/plan/v3/contents/generations/tasks/{id}` |

Authentication: `Authorization: Bearer <API_KEY>` header on every request.

## Default Tools

- `doubao_video_create` — create a text-to-video or image-to-video generation task
- `doubao_video_query` — query a task's status and result video URL by task ID
- `doubao_video_list` — list tasks with pagination and status/model/task-id filters
- `doubao_video_cancel` — cancel or delete a task by task ID

## Workflow

1. User provides a prompt (text-to-video) and/or a first-frame image URL (image-to-video), plus an optional model.
2. AI reads API_KEY from `.doubao-video/.env` (auto-created with a clear message if missing).
3. AI calls `doubao_video_create`, which returns a task ID.
4. Video generation is asynchronous — AI polls `doubao_video_query` with the task ID until status is `succeeded` (then a video URL is returned) or `failed`.
5. Use `doubao_video_list` to review recent tasks, and `doubao_video_cancel` to abort or delete a task.

## Safety Rules

- API keys are read from `.doubao-video/.env` only, never hardcoded and never printed in full.
- Tools return the raw API response so the AI can surface accurate status with evidence; do not fabricate task status or URLs.
- The AI must report the actual task ID and status returned by the API. If a request fails, report the HTTP status and error body.
- User must have a valid API_KEY configured; tools fail with a clear, actionable message if it is missing.

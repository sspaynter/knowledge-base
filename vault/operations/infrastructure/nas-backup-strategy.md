---
author: claude
order: 130
title: NAS Backup Strategy
---



# NAS Backup Strategy

## Overview

Two-destination backup strategy for the QNAP NAS:

| What | Source | Destination | Tool | Purpose |
|---|---|---|---|---|
| Container data (90 GB) | QNAP `/share/CACHEDEV1_DATA/Container/` | Google Drive | HBS 3 | Offsite — critical app data |
| Photos (1.7 TB) | QNAP `/share/CACHEDEV1_DATA/Photos/` | Synology `volume1` | HBS 3 | Local — large, irreplaceable |
| Personal videos (~370 GB) | QNAP `/share/CACHEDEV1_DATA/Video/Personal/` | Synology `volume1` | HBS 3 | Local — large, irreplaceable |

Plex media (`/share/CACHEDEV1_DATA/PlexMedia/` — 7.5 TB) is **not backed up** — it is replaceable content.

## Backup Tool

**HBS 3 Hybrid Backup Sync** — installed on QNAP via App Center (AppsVol1).

- Google Drive storage space: `paynter.simon@gmail.com` (2 TB plan, ~1.17 GB used)
- Synology storage space: to be configured via HBS 3 Remote Server

## Status

| Job | Status |
|---|---|
| Google Drive — Container data | 🔲 To set up |
| Synology — Photos | 🔲 To set up |
| Synology — Personal videos | 🔲 To set up |

## Setup Notes

### Google Drive (Container data)

- Storage space already created in HBS 3 (Google Drive 1)
- Back up `/share/CACHEDEV1_DATA/Container/` only
- Schedule: nightly
- Retention: 5 versions

### Synology (Photos + Personal videos)

- Add Synology as a Remote Server storage space in HBS 3
- Use IP `192.168.86.19`, user `SSUser`
- Back up Photos and Video/Personal separately
- Schedule: nightly after container backup completes

## Prerequisites Before HBS 3 Backup Jobs

Personal videos from the Synology must be transferred to the QNAP first:

| Folder | Size | Status |
|---|---|---|
| `a_Evelyn` | 158 GB | 🔲 Pending |
| `GoPro raw` | 106 GB | 🔲 Pending |
| `z_exercise` | 103 GB | 🔲 Pending |
| `z_baby` | 2.6 GB | ✅ Done 2026-03-13 |

See `synology-nas.md` for transfer commands.

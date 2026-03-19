---
author: claude
order: 120
title: Synology NAS (Secondary)
---



# Synology NAS (Secondary)

## Access

- LAN IP: `192.168.86.19`
- SSH alias: `ssh synology` (key: `~/.ssh/nas_claude`, user: `SSUser`)
- Web interface: `http://192.168.86.19:5000`
- Role: Local backup target for QNAP + personal media archive

## Storage

- Volume: `volume1` — 8.2 TB total, ~3 TB free (as of 2026-03-13)

### Content Inventory

| Folder | Size | Status |
|---|---|---|
| `/volume1/photo/` | 1.3 TB | Personal photos — may have gaps vs QNAP copy |
| `/volume1/video/z_movies` | 1.3 TB | Movies — covered by QNAP Plex, safe to delete |
| `/volume1/video/z_TVseries` | 1.1 TB | TV shows — covered by QNAP Plex, safe to delete |
| `/volume1/video/a_Evelyn` | 158 GB | Personal family videos — pending transfer to QNAP |
| `/volume1/video/GoPro raw` | 106 GB | GoPro footage — pending transfer to QNAP |
| `/volume1/video/z_exercise` | 103 GB | Exercise videos — pending transfer to QNAP |
| `/volume1/files/` | 130 GB | General files |
| `/volume1/@cloudstation/` | 832 GB | Synology Cloud Station sync data |
| `/volume1/video/z_baby` | 2.6 GB | ✅ Transferred to QNAP 2026-03-13 |

## SSH Setup

The QNAP has direct SSH access to the Synology (QNAP key `/root/.ssh/id_rsa` is in Synology `~/.ssh/authorized_keys`). This enables NAS-to-NAS transfers without routing through the Mac.

## Transfer Method — QNAP ↔ Synology

rsync over SSH does not work — the Synology rsync daemon intercepts the connection and requires a separate password. Use **tar over SSH** instead:

```bash
# Run from Mac — transfer runs directly between the two NAS devices
ssh nas "mkdir -p /share/CACHEDEV1_DATA/Video/Personal/{folder} && \
  ssh -o StrictHostKeyChecking=no SSUser@192.168.86.19 \
  'tar cf - /volume1/video/{folder}' | \
  tar xf - --strip-components=3 -C /share/CACHEDEV1_DATA/Video/Personal/{folder}/"
```

Background a long transfer (run on NAS, survives Mac disconnect):

```bash
ssh nas "(ssh -o StrictHostKeyChecking=no SSUser@192.168.86.19 \
  'tar cf - /volume1/video/a_Evelyn' | \
  tar xf - --strip-components=3 -C /share/CACHEDEV1_DATA/Video/Personal/a_Evelyn/) \
  > /share/CACHEDEV1_DATA/Video/Personal/transfer.log 2>&1 &"
```

Check transfer progress:

```bash
ssh nas "tail -f /share/CACHEDEV1_DATA/Video/Personal/transfer.log"
```

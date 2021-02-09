---
title: "Alpha 0.4 Release"
linkTitle: "Release 0.0.4"
date: 2021-02-09
aliases:
  - /updates/v0.0.4
description: >
  The latest pre-alpha of WingVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/189?tab=files).
{{% /pageinfo %}}

This release is the fourth alpha of the Project Wingman extension!

There's a few smaller updates in this version:

- Incompatible mod detection
  - Not all mods for Project Wingman have been properly packed or structured.
  - Some of these mods require manual installation steps for largely unclear reasons
  - Vortex will now try and detect when you install an incompatible mod and warn you beforehand.
  - You will need to contact mod authors to resolve these issues, there's not much Vortex can do here.
- Minor fixes
  - Should now correctly auto-detect the GOG version of Project Wingman when installed.
  - Some other minor refactoring

You should be able to install mods for Project Wingman from Nexus Mods or external archives in this release and support the basic Vortex features of install/enable/disable/deploy/purge.
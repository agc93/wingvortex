---
title: "Alpha 0.5 Release"
linkTitle: "Release 0.0.5"
date: 2021-02-14
aliases:
  - /updates/v0.0.5
description: >
  The latest pre-alpha of WingVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/189?tab=files).
{{% /pageinfo %}}

This release is the next alpha of the Project Wingman extension!

There's a few smaller updates in this version:

- Fix some bugs in installation
  - Particularly for multi-file installations (with the "Advanced Installer" enabled), there was some edge cases that could result in bad installs
  - Installs should now be a bit more consistent no matter what combination of files/choices/structure you install
  - Please report any bugs you find with the new installer.
- Preparation for load order support
  - Note that Load Order support is **not** included in this release due to some bugs in Vortex itself
  - I've added most of the necessary changes to enable load order support in the next release
  - This will actually change how mods are deployed into your game, so keep an eye out for any messages in upcoming versions
- Minor changes
  - This release (and any others before 0.1.0) will include some minor refactorings that should clean the overall extension up
  - You _shouldn't_ notice any impact from these changes but it should make it easier for me to add new features in future.

You should be able to install mods for Project Wingman from Nexus Mods or external archives in this release and support the basic Vortex features of install/enable/disable/deploy/purge.
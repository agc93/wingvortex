---
title: "Alpha 2 Release"
linkTitle: "Release 0.2.0"
date: 2021-07-11
aliases:
  - /updates/v0.2.0
description: >
  The latest pre-alpha of WingVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/189?tab=files).
{{% /pageinfo %}}

This release is the next alpha of the Project Wingman extension!

This one's a big update, both in terms of functionality and under the hood. Note that since we're using some of Vortex's newer bells and whistles now, this version will require Vortex **1.4** or higher. The previous 0.0.5 release will continue to be available for 1.3 users.

- Load order support!
  - You can now manage your mods load order directly in Vortex.
  - Arrange your mods in the Load Order tab and they will take effect when your mods are deployed.
  - Note this changes how the actual files are deployed in the install folder so don't be alarmed.
- Dramatically improved skin and conflict detection (again)
  - While the older QuickBMS-based method worked well, it was _slow_.
  - We've since migrated to a completely new self-contained PAK reader that runs entirely in-process.
  - This version should be just as reliable as before, but also run much, _much_ faster.
  - Most of these improvements also apply to more reliably picking up blueprint (aka data table) mods and conflicts
- Fixed a lot of smaller bugs and problems
  - Most notably the missing icons should be back
  - This one has been a pretty massive change behind-the-scenes so please [report any bugs](https://github.com/agc93/wingvortex/issues) or [give feedback](https://www.nexusmods.com/site/mods/189?tab=posts).

### Migration

Since this release has changed a lot of things behind the scenes, the extension will actually run a short migration process when you first start Vortex after the upgrade. You shouldn't really notice this, but it's mostly just cleaning up a lot of the mess from earlier versions.

You should be able to install mods for Project Wingman from Nexus Mods or external archives in this release and support the basic Vortex features of install/enable/disable/deploy/purge.
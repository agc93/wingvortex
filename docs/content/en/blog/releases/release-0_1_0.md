---
title: "Alpha 1 Release"
linkTitle: "Release 0.1.0"
date: 2021-03-02
aliases:
  - /updates/v0.1.0
description: >
  The latest pre-alpha of WingVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/189?tab=files).
{{% /pageinfo %}}

This release is the next alpha of the Project Wingman extension!

This one's a huge update, both in terms of functionality and under the hood. Note that since we're using some of Vortex's newer bells and whistles now, this version will require Vortex **1.4** or higher. The previous 0.0.5 release will continue to be available for 1.3 users.

- Dramatically improved skin and conflict detection
  - The old method was sloppy and error-prone to be honest.
  - Thanks to a new feature in Vortex 1.4, we can more easily leverage QuickBMS to do a lot of the work for us
  - This version will much more reliably pick up skins included in mods as well as giving you less garbage false-positives
  - Most of these improvements also apply to more reliably picking up blueprint (aka data table) mods and conflicts
- Switched to a new and improved installer
  - Installs should now be a bit more consistent no matter what combination of files/choices/structure you install
  - Under the covers, this is actually a complete change in the installer, so please report any bugs you find with the new version.
- Fixed a lot of smaller bugs and problems
  - This one has been a pretty massive change behind-the-scenes so please [report any bugs](https://github.com/agc93/wingvortex/issues) or [give feedback](https://www.nexusmods.com/site/mods/189?tab=posts).

### Migration

Since this release has changed a lot of things behind the scenes, the extension will actually run a short migration process when you first start Vortex after the upgrade. You shouldn't really notice this, but it's mostly just cleaning up a lot of the mess from earlier versions.

You should be able to install mods for Project Wingman from Nexus Mods or external archives in this release and support the basic Vortex features of install/enable/disable/deploy/purge.
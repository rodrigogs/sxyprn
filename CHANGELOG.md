# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project scaffold (TypeScript, ESM+CJS dual package, Vitest, Biome) following the
  `pornhub` / `xvideos` family conventions.
- Site structure map for sxyprn.com (`docs/site-structure.md`), verified live 2026-09-22,
  including the `data-vnfo` stream-URL deobfuscation algorithm and its validation
  against a real request (HTTP 206, `video/mp4`).

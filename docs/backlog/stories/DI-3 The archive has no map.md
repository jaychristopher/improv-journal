---
key: DI-3
type: story
summary: A person looking for improv near them thinks in geography, and the hub offered sixty names in a list; a map of the sixty cities, usable with a mouse, a keyboard, a screen reader and a thumb
epic: "[[Improv directory]]"
status: Done
priority: High
labels: [product, directory, accessibility]
tasks:
  - "[[DI-3.1 Put the sixty cities on a map]]"
---

# DI-3 — The archive has no map

"Improv near you" is a geographic question and the hub answered it with an
alphabet. A reader in Fort Worth has to know that Fort Worth is one of the
sixty and find it among them; a reader in Boise has to read all sixty to
learn that Boise is not. A map answers both at a glance, and it is the one
view of this archive that a list cannot give.

The condition the owner set is that it be fully usable: tap a city and go to
it, see what is listed there before you commit to the journey, and none of
that gated behind a mouse. That rules out the usual map-of-dots, which puts
eight-pixel targets a thumb cannot hit and a keyboard cannot reach, and
hangs its only labels off hover.

## What it is

A dot a city on an Albers USA map, each one a link to that city's page,
carrying what is listed there as its accessible name and showing it in a
tooltip on hover and on focus. The city list stays underneath, unchanged: the
map is a second way in, never the only one.

## Done when

- Every city is reachable by keyboard, by screen reader and by touch, and
  no two targets overlap at any width the map is drawn at.
- The map costs the page no more than the markers themselves.
- A guard holds the geometry, so a later change cannot shrink a target or
  move a city into the sea without the suite saying so.

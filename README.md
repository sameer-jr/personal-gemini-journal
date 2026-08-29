<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Personal Gemini Journal

> A security-first AI reflection workspace built for the Google Cloud Gen AI Academy APAC Ideathon.

## Live Demo

**Cloud Run:**  
https://personal-gemini-journal-258257579679.us-central1.run.app/

> Gemini-powered features require a valid Gemini API key and available API quota configured through Google Cloud Secret Manager. The Gemini secret is never exposed to the browser.

## Project Overview

Personal Gemini Journal is a private journaling application designed around a simple principle: **personal reflections should remain personal**.

Users authenticate with Firebase, create private journal entries, receive AI-assisted reflections, explore emotional trends, and build a long-term **Memory Vault** containing meaningful insights extracted from their journal history.

The project uses:

- Firebase Authentication
- Cloud Firestore
- Google Gemini API
- Google Cloud Secret Manager
- Google Cloud Run
- Express + TypeScript
- React + Vite

## Problem

AI journaling applications can process highly personal information such as emotions, relationships, goals, fears, failures, and life experiences.

A secure journaling application therefore needs more than a polished interface. It requires strong authentication, per-user data isolation, secure API-key handling, input validation, and defensive backend design.

## Solution

Firebase Authentication acts as the authoritative identity provider.

Protected backend requests contain a Firebase ID token. The Express backend verifies the token using Firebase Admin SDK and derives the user's UID from the verified token.

The application does not trust a user ID supplied by the browser.

Firestore data is isolated under:

```text
users/{uid}/entries/{entryId}
users/{uid}/memories/{memoryId}
users/{uid}/insights/{insightId}
users/{uid}/settings/{docId}

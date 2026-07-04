<p align="center">
  <img src="hamster.png" width="240" height="240" alt="Hamster">
</p>

[![GitHub Stars](https://img.shields.io/github/stars/Himanshu09211/Real-Time-Collaborative-Docs?style=social)](https://github.com/Himanshu09211/Real-Time-Collaborative-Docs/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/Anas-github-acc/hamster?style=social)](https://github.com/Himanshu09211/Real-Time-Collaborative-Docs/network/members)
[![GitHub Contributors](https://img.shields.io/github/contributors/Himanshu09211/Real-Time-Collaborative-Docs?style=flat-square&label=GitHub%20Contributors&color=2ea44f)](https://github.com/Himanshu09211/Real-Time-Collaborative-Docs/graphs/contributors)
[![GitHub Issues](https://img.shields.io/github/issues/Himanshu09211/Real-Time-Collaborative-Docs?style=flat-square&label=Open%20Issues&color=d73a4a)](https://github.com/Himanshu09211/Real-Time-Collaborative-Docs/issues)
[![License](https://img.shields.io/github/license/Himanshu09211/Real-Time-Collaborative-Docs?style=flat-square&label=License&color=007ec6)](https://github.com/Himanshu09211/Real-Time-Collaborative-Docs/blob/main/LICENSE)

<p align="left">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=flat&logo=tailwindcss" alt="TailwindCSS">
  <img src="https://img.shields.io/badge/shadcn/ui-0.4-000000?style=flat" alt="shadcn/ui">
  <img src="https://img.shields.io/badge/Firebase-Hosting-FFCA28?style=flat&logo=firebase" alt="Firebase Hosting">
  <img src="https://img.shields.io/badge/Firestore-FFCA28?style=flat&logo=firebase" alt="Firestore">
  <img src="https://img.shields.io/badge/Cloud%20Functions-4285F4?style=flat&logo=google-cloud" alt="Cloud Functions for Firebase">
  <img src="https://img.shields.io/badge/Cloud%20Scheduler-4285F4?style=flat&logo=google-cloud" alt="Cloud Scheduler">
  <img src="https://img.shields.io/badge/Storage-FFCA28?style=flat&logo=firebase" alt="Firebase Storage">
  <img src="https://img.shields.io/badge/FCM-FFCA28?style=flat&logo=firebase" alt="Firebase Cloud Messaging">
  <img src="https://img.shields.io/badge/Gemini-1.5%20Flash-FF6D00?style=flat" alt="Gemini API">
</p>
 
# Real-time collaborative Docs 

Real-time collaborative workspace platform built on Firebase and Google Cloud Platform free tiers.

## Overview

Hamster is a real-time collaboration platform that enables teams to work together on documents, chat, and share files. The project is architected to run within Firebase and GCP free tier limits while providing production-grade features including real-time synchronization, AI-powered content assistance, and push notifications.

## Tech Stack

| | Technology | Description |
|---|------------|-------------|
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="24" height="24"> | **React 18** | UI framework with hooks and concurrent rendering |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="24" height="24"> | **TypeScript 5** | Type-safe JavaScript superset |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vite/vite-original.svg" width="24" height="24"> | **Vite 5** | Next-generation frontend tooling |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" width="24" height="24"> | **TailwindCSS 3** | Utility-first CSS framework |
| <img src="https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/shadcnui.svg" width="24" height="24"> | **shadcn/ui** | Reusable component library |
| <img src="https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/radixui.svg" width="24" height="24"> | **Radix UI** | Unstyled accessible components |

## Cloud Platform

| | Service | Description |
|---|---------|-------------|
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/firebase/firebase-plain.svg" width="24" height="24"> | **Firebase Hosting** | Global CDN and static hosting |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-plain.svg" width="24" height="24"> | **Cloud Firestore** | NoSQL document database |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-plain.svg" width="24" height="24"> | **Cloud Functions** | Serverless compute backend |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-plain.svg" width="24" height="24"> | **Cloud Scheduler** | CRON job scheduling |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/supabase/supabase-original.svg" width="24" height="24"> | **Supabase Storage** | S3-compatible object storage |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/firebase/firebase-plain.svg" width="24" height="24"> | **FCM** | Push notifications |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" width="24" height="24"> | **Gemini API** | AI content generation |

## Features

- Real-time collaborative document editing with presence indicators
- Team chat and messaging with real-time updates
- File upload and sharing with metadata management
- AI-powered content summarization and generation
- Push notifications for team activity
- Admin analytics dashboard with daily metric rollups
- Scheduled background jobs for data maintenance

## Prerequisites

- Node.js 20 or higher
- Firebase CLI
- Firebase project on Blaze plan (required for Cloud Functions)

## Quick Start

```bash
# Install frontend dependencies
cd web-v4 && npm install

# Install function dependencies
cd ../functions && npm install

# Configure Firebase project
# Update .firebaserc with your project ID
# Update firebaseConfig in web-v4/src/lib/firebase.ts

# Run local development
cd ../web-v4 && npm run dev
```

## Deployment

```bash
# Deploy security rules
firebase deploy --only firestore:rules,firestore:indexes,database,storage

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy hosting
firebase deploy --only hosting
```

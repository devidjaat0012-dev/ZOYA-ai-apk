# Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants
1. **Strict Owner Isolation (`/users/{userId}`)**: A user profile document at `/users/{userId}` can only be read, created, or updated by the authenticated user whose `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **Parent Existence & Relational Sync (`/users/{userId}/memories/{memoryId}`)**: A memory document in `/users/{userId}/memories/{memoryId}` can only be accessed or mutated if `request.auth.uid == userId`, `request.auth.token.email_verified == true`, and the parent `/users/{userId}` document exists.
3. **Immutable Identity & Creation Timestamps**: `uid` and `createdAt` can never be modified after document creation (`incoming().uid == existing().uid` and `incoming().createdAt == existing().createdAt`).
4. **Server Timestamp Enforcement**: `createdAt` on create and `updatedAt` on update must strictly equal `request.time`.
5. **Strict Key & Volumetric Validation**: No extra/shadow fields are permitted (`hasOnly`), and every string field is bounded by strict `maxLength` checks matching `firebase-blueprint.json`.

## 2. The "Dirty Dozen" Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unauthenticated Write**: `auth = null`, creating `/users/user_1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `auth = { uid: 'user_1', token: { email_verified: false } }`, creating `/users/user_1` -> `PERMISSION_DENIED`.
3. **Cross-User Profile Read (PII Leak)**: `auth = { uid: 'user_2', token: { email_verified: true } }`, reading `/users/user_1` -> `PERMISSION_DENIED`.
4. **UID Spoofing in Payload**: `auth = { uid: 'user_1' }`, creating `/users/user_1` with `{ uid: 'user_2', ... }` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection on Create**: Creating `/users/user_1` with `{ ..., isAdmin: true }` -> `PERMISSION_DENIED`.
6. **Shadow Field Injection on Update**: Updating `/users/user_1` with `{ displayName: 'Devid', role: 'admin' }` -> `PERMISSION_DENIED`.
7. **Forged Client Timestamp on Create**: Creating `/users/user_1` with `createdAt: Timestamp.fromMillis(1000)` instead of `request.time` -> `PERMISSION_DENIED`.
8. **Mutating Immutable `createdAt` on Update**: Updating `/users/user_1` with a modified `createdAt` -> `PERMISSION_DENIED`.
9. **Oversized String Resource Poisoning**: Creating `/users/user_1` with `displayName` of 5,000 characters (`> 100`) -> `PERMISSION_DENIED`.
10. **Invalid Enum Value**: Creating `/users/user_1` with `personaVibe: 'hacker_mode'` -> `PERMISSION_DENIED`.
11. **Orphaned Subcollection Write**: Creating `/users/user_1/memories/mem_1` when `/users/user_1` does not exist -> `PERMISSION_DENIED`.
12. **Invalid Document ID Poisoning**: Creating `/users/user_1/memories/invalid id with spaces!` -> `PERMISSION_DENIED`.

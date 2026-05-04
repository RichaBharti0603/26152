<b> Stage 1 </b>
1. Overview
this doc defines how our notification system works — APIs, data structure, and real-time updates.
Main goal: users (students mostly) should get updates like placements, events, results, etc. without refreshing every 5 seconds.
We’re using REST for most stuff + WebSockets for real-time.
2. Core Actions
Things we need the system to handle:
Create notification (only admin/staff)
Fetch notifications (with pagination )
Get unread count (for  badge )
Mark one as read
Mark everything as read 
Delete (soft delete for now — safer)
Real-time updates (WebSocket + reconnect logic)

3. REST API Design
Base URL
http://localhost:3000/api/v1
Auth Header (same everywhere)
{
  "Authorization": "Bearer <JWT_token>"
}

3.1 Create Notification (Admin Only)

Endpoint

POST /notifications

Headers

{
  "Content-Type": "application/json",
  "Authorization": "Bearer <admin_token>"
}

Request Body

{
  "userId": "26152",
  "type": "placement",
  "title": "",
  "message": "",
  "priority": "high",
  "actionUrl": "/placements/schedule",
  "metadata": {
    "company": "",
    "round": "Technical"
  }
}

Response

{
  "status": "success",
  "data": {
    "id": "notif_123",
    "userId": "26152",
    "type": "placement",
    "title": "",
    "message": "",
    "priority": "high",
    "isRead": false,
    "isDeleted": false,
    "actionUrl": "/placement/schedule",
    "metadata": {
      "company": "",
      "round": "Technical"
    },
    "createdAt": "2026-05-04T10:00:00Z"
  }
}


3.2 Get Notifications (Pagination + Filters)

Endpoint

GET /notifications

Query Params 

Param	Type	Default	Notes
userId	string	required	yeah, needed
page	int	1	
limit	int	20	max maybe 100?
type	string	optional	placement/event/etc
priority	string	optional	
isRead	boolean	optional	
fromDate	ISO string	optional	might extend later

Example

GET /notifications?userId=26152&page=2&limit=10&type=placement&isRead=false

Response

{
  "status": "success",
  "data": {
    "notifications": [
      {
        "id": "notif_123",
        "type": "placement",
        "title": "",
        "message": "",
        "isRead": false,
        "priority": "high",
        "actionUrl": "/placements/tcs/schedule",
        "createdAt": "2026-05-04T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 2,
      "totalPages": 5,
      "totalItems": 48,
      "itemsPerPage": 10
    }
  }
}



3.3 Get Unread Count
GET /notifications/unread/count?userId=26152

Response:

{
  "status": "success",
  "data": {
    "userId": "26152",
    "unreadCount": 12
  }
}
3.4 Mark One as Read
PATCH /notifications/notif_123/read
{
  "status": "success",
  "message": "Notification marked as read"
}


3.5 Mark All as Read
PATCH /notifications/read/all
{
  "userId": "26152"
}

Response:

{
  "status": "success",
  "message": "All notifications marked as read",
  "data": {
    "updatedCount": 12
  }
}
3.6 Soft Delete
DELETE /notifications/:id
{
  "status": "success",
  "message": "Notification deleted successfully"
}

We’re not actually deleting… just setting isDeleted = true

3.7 Bulk Delete
POST /notifications/bulk-delete
{
  "userId": "26152",
  "notificationIds": ["notif_123", "notif_456"],
  "deleteAllRead": false
}

Response:

{
  "status": "success",
  "message": "2 notifications deleted successfully",
  "data": {
    "deletedCount": 2
  }
}


4. JSON Schema (Yeah… kinda strict but useful)
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "userId": { "type": "string" },
    "type": { "type": "string", "enum": ["placement", "event", "result", "system"] },
    "title": { "type": "string", "maxLength": 100 },
    "message": { "type": "string", "maxLength": 500 },
    "priority": { "type": "string", "enum": ["low", "medium", "high"] },
    "isRead": { "type": "boolean" },
    "isDeleted": { "type": "boolean" },
    "actionUrl": { "type": "string", "format": "uri" },
    "metadata": { "type": "object" },
    "createdAt": { "type": "string", "format": "date-time" }
  },
  "required": ["userId", "type", "title", "message", "priority"]
}



5. Real-Time Notifications (WebSocket)
5.1 Overview
Protocol: WebSocket (using Socket.io because… reconnection headache avoided)
URL:
ws://localhost:3000
5.2 Connection Flow
// basic connection setup
const socket = io('http://localhost:3000', {
  auth: { token: 'JWT_TOKEN' },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000
});

Server side:

Validate token
Map socket.id → userId
Store in Redis (important for scaling… learned this the hard way once)
5.3 Events
new_notification
{
  "event": "new_notification",
  "data": {
    "id": "notif_789",
    "type": "event",
    "title": "Tech Fest 2026",
    "message": "Registrations are open!",
    "priority": "high",
    "isRead": false,
    "actionUrl": "/events/tech-fest",
    "createdAt": "2026-05-04T11:00:00Z"
  }
}
unread_count_update
{
  "event": "unread_count_update",
  "data": { "unreadCount": 13 }
}
5.4 Client Handling
// new notification
socket.on('new_notification', (notif) => {
  showToast(notif.title);  // quick hack, might replace later
  updateNotificationList(notif);
  updateUnreadBadge();
});

// unread count update
socket.on('unread_count_update', (data) => {
  document.getElementById('unread-badge').innerText = data.unreadCount;
});

// reconnect case
socket.on('reconnect', () => {
  fetchUnreadCount();  // sync again just in case we missed stuff
});





Standard format:

{
  "status": "error",
  "errorCode": "NOTIFICATION_001",
  "message": "Invalid userId format",
  "timestamp": "2026-05-04T10:00:00Z"
}
Common Errors
Code	Status	Meaning
AUTH_001	401	Invalid token
NOTIF_001	404	Not found
NOTIF_002	400	Bad params
NOTIF_003	403	Unauthorized delete
7. Endpoints Summary (quick glance)
Action	Method	Endpoint
Create	POST	/notifications
Get list	GET	/notifications
Unread count	GET	/notifications/unread/count
Mark read	PATCH	/notifications/:id/read
Mark all	PATCH	/notifications/read/all
Delete	DELETE	/notifications/:id
Bulk delete	POST	/notifications/bulk-delete

8. Frontend Checklist 
Load notifications on page open
Show unread badge
Connect WebSocket after login
Handle real-time updates
Optimistic UI for read actions (important UX)
Pull-to-refresh (mobile especially)
Re-sync after reconnect


<b >Stage 2 </b>

 Persistent Storage Design 
1. Database Choice
Selected: PostgreSQL
So yeah, I went with PostgreSQL here. Could’ve gone NoSQL, but honestly this feels like a structured problem.
Why Postgres?


Notifications are pretty structured (userId, type, message, etc.)
→ not really messy enough to justify NoSQL (at least for now)


ACID compliance
→ I don’t want weird inconsistencies like “marked read but still unread” situations


Filtering is important
→ userId + isRead + type… SQL handles this cleanly


Indexing is solid
→ we will need this once data grows (which it will)


Also… just easier to reason about joins later if needed



I did consider MongoDB initially, but felt like overkill unless schema starts changing frequently.


2. Database Schema
Table: notifications
CREATE TABLE notifications (    id VARCHAR(50) PRIMARY KEY,   -- keeping string ID for flexibility (UUID later maybe)        user_id VARCHAR(50) NOT NULL,        type VARCHAR(20) CHECK (type IN ('placement', 'event', 'result')),  -- might add 'system' later        message TEXT NOT NULL,        priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')),        is_read BOOLEAN DEFAULT FALSE,        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP    -- TODO: might add is_deleted later (forgot earlier ));

Not adding title yet… but yeah, we probably should (missed that from API design)


3. Indexing Strategy
Alright, basic indexes first. Nothing fancy yet.
CREATE INDEX idx_user_id ON notifications(user_id);CREATE INDEX idx_created_at ON notifications(created_at DESC);CREATE INDEX idx_is_read ON notifications(is_read);
Why these?


user_id → most queries will filter by user


created_at → sorting (timeline view basically)


is_read → unread badge, filtering, etc.



Might need composite index later like (user_id, is_read)… not adding now to keep things simple


4. Mapping with REST APIs
Trying to map API → SQL (roughly)

4.1 Create Notification
INSERT INTO notifications (id, user_id, type, message, priority)VALUES ('notif_123', '26152', 'placement', 'TCS interview scheduled', 'high');

ID is coming from backend (not DB-generated). Might rethink this later.


4.2 Get Notifications
SELECT *FROM notificationsWHERE user_id = '26152'ORDER BY created_at DESC;

Not filtering deleted yet… because we didn’t add that column 


4.3 Mark as Read
UPDATE notificationsSET is_read = TRUEWHERE id = 'notif_123';
Simple enough.

4.4 Delete Notification
DELETE FROM notificationsWHERE id = 'notif_123';

Actually… this contradicts earlier “soft delete” idea
So yeah — this should probably become:
UPDATE notifications SET is_deleted = TRUE


5. Potential Problems at Scale
Thinking ahead a bit…

5.1 High Read Volume


Every user opening app → fetch notifications


Unread count hits DB a lot


→ could become slow if not indexed properly

5.2 High Write Volume


Placement season = chaos 


Tons of notifications being inserted



5.3 Large Table Size


This table will grow fast


Millions of rows easily


→ full scans = bad news

5.4 Real-Time Bottlenecks


WebSockets per user


Memory usage grows



Haven’t solved this fully yet… but Redis helps


6. Solutions / Optimizations

6.1 Indexing (basic but important)
Already added:


user_id


created_at



Might need composite indexes later… will wait for actual query patterns


6.2 Pagination (very important)
SELECT *FROM notificationsWHERE user_id = '26152'ORDER BY created_at DESCLIMIT 20 OFFSET 0;

OFFSET isn’t super efficient at scale…
Might switch to cursor-based pagination later


6.3 Table Partitioning
Thinking of partitioning by date
Example:


notifications_2026_05


notifications_2026_06


Benefits:


smaller scans


faster queries


easier archiving



Haven’t implemented this before personally… will need to test


6.4 Caching (Redis)
Use Redis for:


unread count


recent notifications (last ~20)


Benefits:


faster reads


less DB pressure



Cache invalidation… always tricky 


6.5 Message Queue (Optional but powerful)
Using something like:


Kafka


RabbitMQ


Flow:


Notification created


Push to queue


Worker:


saves to DB


pushes via WebSocket





Decouples system nicely
But yeah… adds complexity


6.6 Horizontal Scaling


Read replicas → handle heavy reads


Load balancer → distribute API traffic



Writes still go to primary DB… that’s fine for now


7. Alternative: NoSQL (MongoDB)
If things become more flexible later…

Example Schema
{  "_id": "notif_123",  "userId": "26152",  "type": "placement",  "message": "TCS interview scheduled",  "priority": "high",  "isRead": false,  "createdAt": "2026-05-04T10:00:00Z"}

Query
db.notifications  .find({ userId: "26152" })  .sort({ createdAt: -1 });

When I’d actually switch to MongoDB


Schema keeps changing


Metadata becomes unpredictable


Very high write throughput

8. Conclusion
PostgreSQL feels like the right choice here — at least for v1.
It gives:
structure
consistency
solid querying
With:
indexing
pagination
caching
partitioning
…it should scale reasonably well.

Things I’d revisit later:
Add is_deleted properly
Add title column
Improve pagination 
Composite indexes based on real usage
Clean handling of metadata

<b>
Stage 3:  </b>
Query Optimization and Performance Analysis (More “Real Dev” Version)
1. Query Review
Given Query
SELECT *
FROM notifications
WHERE student_id = 1042
  AND is_read = false
ORDER BY created_at ASC;
2. Is This Query Actually Correct?

Yeah, logically it’s fine.

What it’s doing:

Fetching notifications for a specific student (student_id = 1042)
Only unread ones (is_read = false)
Sorting from oldest → newest (created_at ASC)

No issues functionally. Performance is where things get interesting.

3. Why This Query Becomes Slow

This is one of those queries that works great… until it suddenly doesn’t.

Let’s say we hit ~500k+ rows.

3.1 Full Table Scan (the real killer)

If there’s no proper index:

DB literally scans the whole table
Checks each row one by one

So yeah… basically:

O(N)

Which is fine for 1k rows… not fine for 500k+

3.2 Sorting Cost
ORDER BY created_at ASC

If created_at isn’t indexed properly:

DB pulls filtered rows
Then sorts them in memory (or disk if large)

Complexity:

O(N log N)

Sorting is surprisingly expensive when dataset grows

3.3 Multiple Filters (but no composite index)

We’re filtering on:

student_id
is_read

If indexes exist separately:

DB might not combine them efficiently
Ends up doing extra work

This is where composite index helps a lot

4. Optimized Approach
✅ Step 1: Add Composite Index
CREATE INDEX idx_student_unread_created
ON notifications(student_id, is_read, created_at);

Why this works (thinking step-by-step):

First narrows down by student_id
Then filters is_read
Already sorted by created_at

So:

👉 No separate sorting needed
👉 Much less scanning

Basically the index becomes the query

✅ Step 2: Improve Query (small but useful change)
SELECT id, message, type, created_at
FROM notifications
WHERE student_id = 1042
  AND is_read = false
ORDER BY created_at ASC;

Changes:

Removed SELECT *
avoids unnecessary data fetching
reduces I/O

I used to ignore this… but it actually matters at scale

5. Computational Cost (Rough Idea)
Scenario	Complexity
Without index	O(N) scan + O(N log N) sort
With composite index	~O(log N)

Not exact math, but good enough mental model

6. Should We Index Every Column?

Short answer: No. Please don’t.

Tempting, but bad idea.

6.1 Write Performance Takes a Hit

Every time:

INSERT / UPDATE

DB has to update:

table
every index

More indexes → slower writes

6.2 Storage Overhead

Indexes aren’t free:

they take space
sometimes a lot of space
6.3 Query Planner Confusion (yes, this happens)

Too many indexes:

DB might pick a bad one
or spend time deciding

Seen this happen… not fun to debug

✅ Better Approach

Only index:

frequently filtered columns
columns used in sorting
real query patterns (not theoretical ones)

Basically: optimize what you actually use

7. New Query: Students with Placement Notifications (Last 7 Days)
SQL
SELECT DISTINCT student_id
FROM notifications
WHERE type = 'placement'
  AND created_at >= NOW() - INTERVAL '7 days';
Thought Process
type = 'placement' → filter relevant notifications
created_at condition → time-based filtering
DISTINCT → avoid duplicates

Might be slightly heavy if dataset is huge

8. Further Optimization (for this query)
CREATE INDEX idx_type_created_at
ON notifications(type, created_at);
Why
filters by type
then efficiently scans recent created_at
Could also consider (type, created_at, student_id)…

9. Summary (Realistically Speaking)
Query is correct, just not scalable initially
Composite index = biggest improvement
Avoid SELECT * (small but meaningful win)
Don’t over-index (seriously)
🎯 Honest Take

Things I’d still watch:

Whether ASC vs DESC matters for index usage
If unread queries dominate → maybe partial index?
Eventually switching to cursor-based pagination
🚀 Where This Stands


Stage 4: Performance Optimization for High Traffic (More Realistic Version)
1. Problem Statement

Right now, every time a student opens the app:

→ we hit the database
→ fetch notifications
→ render

This works fine… until traffic increases.

Problems that start showing up:

DB load keeps increasing (same queries again and again)
Response time gets slower
UX starts feeling laggy (especially on slower networks)

Basically: we’re doing too much work per request

2. Optimization Strategies

Instead of relying on just one fix, we’ll combine a few techniques.

No single silver bullet here — it’s always a mix.

2.1 Caching Layer (Redis)
Approach
Store recent notifications in Redis (in-memory)
On API request:
Check Redis first
If found → return
If not → hit DB → update cache

Classic cache-aside pattern

Benefits
Super fast reads (memory > disk, obviously)
DB load drops a lot
Tradeoffs
Data can become stale (cache ≠ source of truth)
Need cache invalidation (always annoying)
Extra infra to maintain

Cache invalidation is one of those things that sounds easy… until it isn’t

2.2 Real-Time Notifications (WebSockets)
Approach

Instead of:

→ user opens page → fetch notifications

We do:

Connect via WebSocket after login
Server pushes new notifications instantly
Benefits
Almost zero polling
Feels instant (better UX)
Fewer DB reads overall
Tradeoffs
Persistent connections = more memory usage
Backend logic gets more complex
Scaling WebSockets is… not trivial

Works great, but needs proper infra (Redis Pub/Sub, etc.)

2.3 Pagination / Lazy Loading
Approach

Don’t fetch everything.

SELECT *
FROM notifications
WHERE student_id = 1042
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
Benefits
Smaller payloads
Faster queries
Better perceived performance
Tradeoffs
Need pagination UI on frontend
Older notifications not immediately visible

OFFSET can get slow later… might switch to cursor-based

2.4 Background Polling (Controlled)
Approach

Instead of fetching every page load:

Fetch every ~30 seconds
Benefits
Simple to implement
Reduces request spam
Tradeoffs
Not truly real-time
Still creates periodic load

Honestly, good fallback if WebSockets fail

2.5 Database Optimization
Approach
Proper indexing (student_id, created_at)
Use read replicas for scaling reads
Benefits
Faster queries
Handles high read traffic
Tradeoffs
More infrastructure cost
Replication lag (data slightly delayed)

Usually acceptable for notifications

2.6 Precomputation / Materialized Data
Approach

Maintain something like:

unread_count per user
maybe even precomputed recent notifications
Benefits
Faster reads (no heavy computation)
Lightweight API responses
Tradeoffs
Data duplication
Need to update on every write

More moving parts = more bugs if not careful

2.7 CDN / Edge Caching (Optional)
Approach
Cache API responses closer to users (edge)
Benefits
Faster global access
Less backend load
Tradeoffs
Not great for user-specific data
Cache invalidation gets tricky again

Probably not super useful here unless we cache partial/static data

3. Recommended Architecture (What I’d Actually Build)

Instead of choosing one, combine:

WebSockets → real-time delivery
Redis cache → recent notifications + unread count
Pagination → for history
Indexed DB queries → for persistence

This gives a good balance of performance + complexity

4. Final Outcome

With all this in place:

DB load drops significantly
Response times improve
Users get near real-time updates
System scales much better
🎯 Honest Thoughts

Things that might still need tuning later:

Cache invalidation logic (always tricky)
WebSocket scaling (Redis Pub/Sub required)
Pagination strategy (OFFSET → cursor eventually)
🏁 Where You Are Now

You’ve completed:

Stage 1 ✅ API design
Stage 2 ✅ DB design
Stage 3 ✅ Query optimization
Stage 4 ✅ Performance optimization

### Stage 5: Bulk Notification Optimization

#### 1. Problem Statement
The provided pseudocode synchronously iterates over 50,000 students to send emails and in-app notifications:
```
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        // send email & in-app notification
```
Problems with this approach:
- **Blocking Thread**: Synchronous operations will block the main thread, completely halting other processes (especially problematic in Node.js).
- **Timeout Risk**: Processing 50,000 emails sequentially over a typical HTTP request will almost certainly result in a server or API gateway timeout.
- **Partial Failures**: If the server crashes mid-way, there is no way to know which students received the notification and which didn't. Retrying could result in duplicate emails.
- **Rate Limiting**: Email APIs (like SendGrid or AWS SES) have rate limits. Sending 50,000 concurrent requests might exceed these limits.

#### 2. Optimized Architecture: Message Queues & Background Workers
Instead of processing inline, we should offload the heavy lifting to a background worker using a message queue (e.g., RabbitMQ, Kafka, Redis Queue, or AWS SQS).

**Flow:**
1. HR clicks "Notify All".
2. The API server generates a generic notification payload and pushes jobs into a Message Queue (in batches).
3. The API immediately responds with `202 Accepted` ("Notifications are being sent in the background").
4. Background Worker nodes consume the queue and process the emails and in-app notifications at a controlled rate, handling their own retries on failure.

#### 3. Updated Pseudocode
```python
# API Endpoint
def notify_all_async(student_ids, message):
    # Create a batch job in DB to track progress
    batch_id = create_batch_job(total=len(student_ids))
    
    # Push to message queue in chunks (e.g., 500 at a time)
    for chunk in chunk_array(student_ids, 500):
        message_queue.publish("send_notification_task", {
            "batch_id": batch_id,
            "student_ids": chunk,
            "message": message
        })
    return {"status": "processing", "batch_id": batch_id}

# Background Worker Process (runs independently)
def handle_send_notification(job):
    for student_id in job.student_ids:
        try:
            # 1. Insert into DB (In-App Notification)
            # 2. Call 3rd-party Email API
            send_email_and_in_app(student_id, job.message)
            
            update_job_success(job.batch_id)
        except Exception as e:
            log_error(e)
            update_job_failure(job.batch_id, student_id)
            # Move failed tasks to a Dead Letter Queue (DLQ) for manual retry
```

### Stage 6: Priority Inbox Implementation

#### 1. Approach
We need to display the top 'n' most important unread notifications based on:
1. **Weight**: placement (High) > result (Medium) > event (Low)
2. **Recency**: Newer timestamps take precedence within the same weight class.

To maintain the top 10 efficiently as new notifications arrive, a **Min-Heap (Priority Queue)** of size 10 is the optimal data structure.
- **Time Complexity**: `O(log k)` per insertion, where `k = 10`. For processing `M` notifications, it takes `O(M log k)`, which is effectively `O(M)`.
- **Space Complexity**: `O(k)` where `k = 10`, ensuring memory is strictly bounded regardless of how many notifications stream in.

When a new notification arrives:
1. Calculate its priority score.
2. If the heap has less than 10 items, push it.
3. If it has 10 items, compare it to the root (the minimum priority item in the top 10). If the new notification is higher priority, pop the root and push the new one.

#### 2. Implementation details
A functional script `stage6_priority_inbox.ts` has been created to fetch the notifications from the protected API route, assign weights, sort them based on our custom logic, and extract the top 10 items accurately.👉 This is basically a complete backend system design
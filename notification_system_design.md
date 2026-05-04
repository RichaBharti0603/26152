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

Query Params (not super strict yet)

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

Feels too simple… but honestly fine

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
Final Thought


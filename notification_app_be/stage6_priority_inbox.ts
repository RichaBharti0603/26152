import fs from 'fs';

interface Notification {
  ID: string;
  Type: string;
  Message: string;
  Timestamp: string;
}

const API_URL = "http://20.207.122.201/evaluation-service/notifications";
const TOKEN = process.env.TOKEN || "YOUR_TOKEN_HERE"; 

const TYPE_WEIGHT: Record<string, number> = {
  "Placement": 3,
  "Result": 2,
  "Event": 1,
};

class PriorityInbox {
    private top10: Notification[] = [];

    private getWeight(type: string): number {
        const key = Object.keys(TYPE_WEIGHT).find(k => k.toLowerCase() === type.toLowerCase());
        return key ? TYPE_WEIGHT[key] : 0;
    }

    private compare(a: Notification, b: Notification): number {
        const weightA = this.getWeight(a.Type);
        const weightB = this.getWeight(b.Type);

        if (weightA !== weightB) {
            return weightA - weightB;
        }

        const timeA = new Date(a.Timestamp).getTime();
        const timeB = new Date(b.Timestamp).getTime();

        return timeA - timeB;
    }

    public addNotification(notification: Notification) {
        this.top10.push(notification);
        this.top10.sort((a, b) => this.compare(b, a));

        if (this.top10.length > 10) {
            this.top10.pop(); 
        }
    }

    public getTop10(): Notification[] {
        return this.top10;
    }
}

async function fetchNotifications(): Promise<Notification[]> {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.notifications || [];
    } catch (error) {
        console.warn("⚠️ Failed to fetch from API. Using mock data for demonstration.");
        return [
            { "ID": "d146095a", "Type": "Result", "Message": "mid-sem", "Timestamp": "2026-04-22 17:51:30" },
            { "ID": "b283218f", "Type": "Placement", "Message": "CSX Corporation hiring", "Timestamp": "2026-04-22 17:51:18" },
            { "ID": "81589ada", "Type": "Event", "Message": "farewell", "Timestamp": "2026-04-22 17:51:06" },
            { "ID": "0005513a", "Type": "Result", "Message": "mid-sem", "Timestamp": "2026-04-22 17:50:54" },
            { "ID": "ea836726", "Type": "Result", "Message": "project-review", "Timestamp": "2026-04-22 17:50:42" },
            { "ID": "003cb427", "Type": "Result", "Message": "external", "Timestamp": "2026-04-22 17:50:30" },
            { "ID": "e5c4ff20", "Type": "Result", "Message": "project-review", "Timestamp": "2026-04-22 17:50:18" },
            { "ID": "1cfce5ee", "Type": "Event", "Message": "tech-fest", "Timestamp": "2026-04-22 17:50:06" },
            { "ID": "cf2885a6", "Type": "Result", "Message": "project-review", "Timestamp": "2026-04-22 17:49:54" },
            { "ID": "8a7412bd", "Type": "Placement", "Message": "Advanced Micro Devices Inc. hiring", "Timestamp": "2026-04-22 17:49:42" },
            { "ID": "cf2885a7", "Type": "Event", "Message": "hackathon", "Timestamp": "2026-04-22 17:49:00" },
            { "ID": "cf2885a8", "Type": "Event", "Message": "workshop", "Timestamp": "2026-04-22 17:48:00" }
        ];
    }
}

async function main() {
    const inbox = new PriorityInbox();
    const notifications = await fetchNotifications();

    console.log(`Received ${notifications.length} notifications.`);
    console.log("Processing and determining Top 10 Priority...\n");

    for (const notif of notifications) {
        inbox.addNotification(notif);
    }

    const top10 = inbox.getTop10();
    console.log("=== PRIORITY INBOX (TOP 10) ===");
    top10.forEach((n, idx) => {
        console.log(`${idx + 1}. [${n.Type.toUpperCase()}] ${n.Message} (Time: ${n.Timestamp})`);
    });
}

main();

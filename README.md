# **Lightning Line - Project Summary**

## **Core Concept:**
A **digital queue management system** for tax offices that replaces physical waiting lines with digital tickets, accessible via **any mobile phone** (smartphone or basic phone).

---

## **Key Features:**

### **1. Remote Pre-Arrival Check-In** 🆕
- **Check-in from anywhere**: Users can join the queue from home, work, or on the way
- **Prevents crowding**: No need to physically arrive at the tax office to get in line
- **Real-time updates**: Users receive SMS notifications when it's almost their turn
- **Travel time optimization**: System estimates when to leave based on current wait time
- **Example**: User checks in at 9:00 AM from home, gets notified at 10:45 AM that they should head to the office

### **2. TRN-Based Priority System**
- **Input**: User enters TRN (Taxpayer Registration Number)
- **Automatic Detection**: System checks if user is **55+ years old** (based on TRN database)
- **Priority Queue**: Users 55+ or with disabilities go to **priority queue** with faster service
- **Separate Option**: Manual selection for disabilities if not auto-detected

### **3. Service Categorization System** 🆕
**Critical for bottleneck management** - Routes customers by service type:

#### Service Types:
- **🚗 Motor Vehicle Services** (License renewals, registration, inspections)
- **💰 Tax Payments** (Payments, settlements, payment plans)
- **📄 Tax Documents** (Filing, document submission, corrections)
- **📋 General Inquiries** (Questions, information, general assistance)
- **🆘 Other Services** (Special cases, complex issues)

#### Service Routing:
- Each counter is assigned specific service types
- Customers routed to correct counter based on their service selection
- **Prevents wrong-line waiting**: No more "you're in the wrong line" scenarios
- **Balances load**: System distributes customers across available staff

### **4. Digital Queue Process**
1. **Check-in**: Via kiosk, mobile device, or **remote web app**
2. **Service Selection**: Choose service type (Motor Vehicle, Payments, Documents, etc.)
3. **Queue Assignment**: Routed by priority (age/disability) AND service type
4. **Digital Ticket**: 
   - **Smartphones**: QR code + SMS
   - **Basic phones**: SMS text message with queue number
5. **Wait Tracking**: Real-time position updates via SMS
6. **Notification**: SMS when their turn is near (5 customers away)

### **5. Customer Grace Period / Snooze Feature** 🆕
**Directly addresses the "3-strike" problem:**

- **"I Need More Time" button**: Customer can request 5-10 extra minutes
- **Bump back**: Moves them back 1-2 positions instead of removing from queue
- **Limit**: Can snooze 2 times maximum per visit
- **Auto-notification**: "You've been moved back. New estimated time: 2:45 PM"
- **Staff notification**: Counter staff see customer requested more time
- **Use cases**: 
  - Stuck in traffic
  - Parking issues
  - Need restroom break
  - Forgot documents in car

**Example Flow:**
```
Original position: #3 in line
↓
Press "Need 5 More Minutes"
↓
New position: #5 in line
↓
SMS: "No problem! Moved you back. New time: 2:45 PM"
```

### **6. Staff Management**
- **Dashboard**: Real-time view of all queues (by service type)
- **Service Type Assignment**: Staff can handle multiple service types
- **Delay System**: Staff can mark themselves as:
  - Delayed (with reason: technical issue, complex case, etc.)
  - On break
  - Away from counter
- **Queue Adjustment**: Automatic wait time updates when staff are delayed
- **Customer Notes**: Staff can see if customer pressed "snooze" button

### **7. Public Display**
- TV screens showing:
  - Current numbers being served (by service type)
  - Estimated wait times per service
  - Staff delay statuses
  - Priority vs Regular queues
  - Service type queues (Motor Vehicle: 8 waiting, Payments: 3 waiting, etc.)

### **8. ML-Powered Wait Time Predictions** 🆕
- **Machine Learning Model**: Predicts accurate wait times based on:
  - Historical data (day of week, time of day, season)
  - Current queue length
  - Service type complexity
  - Staff availability
  - Average service times per service type
- **Adaptive Learning**: Model improves accuracy over time
- **Real-time adjustments**: Updates predictions as queue changes
- **Accuracy**: Target 85-90% prediction accuracy within ±5 minutes

### **9. Accessible for ALL Phone Types** 🆕
**Critical for elderly users (55+ priority group):**

#### Smartphone Users:
- ✅ QR code for easy counter identification
- ✅ Web app with visual queue position
- ✅ Push notifications
- ✅ SMS backup

#### Basic/Dumb Phone Users:
- ✅ **Standard SMS text messages** (no data/QR needed)
- ✅ Text format: "Lightning Line - You are #A023. Motor Vehicle queue. Position: 5. Est. wait: 25 min"
- ✅ SMS notifications when turn is near
- ✅ SMS "snooze" option: Reply with "WAIT" to get more time
- ✅ Counter shows queue number on TV screen
- ✅ Audio announcements: "Now serving A023 at Counter 3"

**Example SMS Flow (Basic Phone):**
```
9:00 AM: "Lightning Line: You're #A023. Motor Vehicle. Position 8. Wait ~40 min."
9:25 AM: "Update: Position 3. Wait ~15 min. Head to office now!"
9:35 AM: "Almost there! Position 1. Counter 3."
9:40 AM: "NOW SERVING A023 - Counter 3"
[If user can't make it] Reply "WAIT" → Moved back 2 spots
```

---

## **Technology Stack:**
- **Frontend**: React.js with TypeScript
- **Backend**: Node.js/Express
- **Database**: PostgreSQL (stores TRN, age data, queue info, service types, historical data)
- **Real-time**: WebSocket/Socket.io
- **Notifications**: Twilio SMS (works on ANY phone - smartphone or basic)
- **Machine Learning**: Python (scikit-learn/TensorFlow) for wait time prediction
- **ML Features**: Historical patterns, time-series forecasting, queue analytics
- **API Integration**: ML model API for real-time predictions

---

## **Queue Routing Logic:**

### Priority Matrix:
```
1. Service Type (Motor Vehicle, Payments, Documents, Inquiries, Other)
   ↓
2. Priority Level (Senior 55+, Disabled, Regular)
   ↓
3. Check-in Time (FIFO within priority level)
```

### Example Routing:
- **Customer A**: Motor Vehicle + Senior (55+) → **Priority Motor Vehicle Queue**
- **Customer B**: Payments + Regular → **Regular Payments Queue**
- **Customer C**: Documents + Disabled → **Priority Documents Queue**

---

## **Expected Outcome:**
Reduce tax office waiting times by **40-60%** and improve service for elderly/disabled visitors through:
- ✅ Digital queue management
- ✅ Remote check-in (prevents crowding)
- ✅ Service type routing (prevents bottlenecks)
- ✅ ML-powered accurate wait times
- ✅ Grace period system (no more 3-strike anxiety)
- ✅ Accessible for ALL phones (elderly-friendly)

---

## **No Physical Tickets Required**
Everything is digital via **any mobile phone** - smartphones get QR codes, basic phones get SMS text messages. Nobody left behind!

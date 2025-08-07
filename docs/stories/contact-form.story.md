## Story: Contact Form with Dual CRM Routing
### Objective:
Build a form that sends data to n8n and either pushes to Docketwise or redirects to Snug.

### Fields:
- Name, Email, Message, Service Type

### Logic:
- If Service Type = Immigration → n8n + docketwise
- If Estate Planning → n8n + snug redirect

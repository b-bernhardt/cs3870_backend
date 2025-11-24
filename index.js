import express from "express";
import cors from "cors";
import dotenv from "dotenv"
import { MongoClient } from "mongodb";

// Load environment variables FIRST
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // replaces body-parser

// Server configuration
const PORT = process.env.PORT ?? 8081;
const HOST = process.env.HOST ?? "0.0.0.0";

// MongoDB configuration
const MONGO_URI = process.env.MONGO_URI;
const DBNAME = process.env.DBNAME;
const COLLECTION = process.env.COLLECTION;
const client = new MongoClient(MONGO_URI);
const db = client.db(DBNAME);

// GET all contacts
app.get("/contacts", async (req, res) => {
    try {
        await client.connect();
        console.log("Node connected successfully to GET MongoDB");

        const query = {};
        const results = await db.collection(COLLECTION).find(query).limit(100).toArray();

        res.status(200).json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error retrieving contacts");
    }
});

app.get("/name", (req, res) => {
    res.send("My name is rebecca")
});

// GET one contact by name
app.get("/contacts/:name", async (req, res) => {
    try {
        await client.connect();
        console.log("Node connected successfully to GET-id MongoDB");

        const contactName = req.params.name;
        const query = { contact_name: contactName };
        const result = await db.collection(COLLECTION).findOne(query);

        if (!result) {
            res.status(404).send("Not Found");
        } else {
            res.status(200).json(result);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Error retrieving contact");
    }
});


app.post("/contacts", async (req, res) => {

    try {

        // The body exists
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).send({ message: 'Bad request: No data provided.' });
        }

        // Extract fields from body
        const { contact_name, phone_number, message, image_url } = req.body;

        // Connect to MongoDB
        await client.connect();
        console.log("Node connected successfully to POST MongoDB");

        // Reference collection
        const contactsCollection = db.collection(COLLECTION);

        // Check if contact already exists
        const existingContact = await contactsCollection.findOne({
            contact_name: contact_name,
        });

        if (existingContact) {
            return res.status(409).json({
                message: `Contact with name '${contact_name}' already exists.`,
            });
        }

        // Create new Document to POST
        const newDocument = {
            contact_name,
            phone_number,
            message,
            image_url,
        };
        console.log(newDocument);

        // Insert new document into MongoDB
        const result = await contactsCollection.insertOne(newDocument);
        console.log("Document inserted:", result);

        // Acknowledge frontend
        res.status(201);
        res.json({ message: "New contact added successfully" });

    } catch (error) {
        console.error("Error in POST /contacts:", error);
        res.status(500);
        res.json({ message: "Failed to add contact: " + error.message });
    } finally {
        await client.close();
    }
});


app.delete("/contacts/:name", async (req, res) => {
    try {
        // Read parameter id
        const name = req.params.name;
        console.log("Contact to delete :", name);
        // Connect to MongoDB
        await client.connect();
        console.log("Node connected successfully to POST MongoDB");
        // Reference collection
        const contactsCollection = db.collection(COLLECTION);
        // Check if contact already exists
        const existingContact = await contactsCollection.findOne({
            contact_name: name,
        });
        if (!existingContact) {
            return res.status(404).json({
                message: `Contact with name ${name} does NOT exist.`,
            });
        }
        // Define query
        const query = { contact_name: name };
        // Delete one contact
        const results = await db.collection("contacts").deleteOne(query);
        // Response to Client
        res.status(200);
        // res.send(results);
        res.send({ message: `Contact ${name} was DELETED successfully.` });
    }
    catch (error) {
        console.error("Error deleting robot:", error);
        res.status(500).send({ message: 'Internal Server Error' + error });
    }
});

app.post("/contacts/update", async (req, res) => {
    try {
        await client.connect();
        console.log("Node connected to POST update MongoDB");

        const { old_name, contact_name, phone_number, message, image_url } = req.body;

        if (!old_name) {
            return res.status(400).json({ message: "old_name is required." });
        }

        const contactsCollection = db.collection(COLLECTION);

        // Check if existing contact exists
        const existing = await contactsCollection.findOne({ contact_name: old_name });
        if (!existing) {
            return res.status(404).json({
                message: `Contact '${old_name}' does NOT exist.`,
            });
        }

        // Build update object only with fields provided
        const updates = {};
        if (contact_name) updates.contact_name = contact_name;
        if (phone_number) updates.phone_number = phone_number;
        if (message) updates.message = message;
        if (image_url) updates.image_url = image_url;

        await contactsCollection.updateOne(
            { contact_name: old_name },
            { $set: updates }
        );

        res.status(200).json({
            message: `Contact '${old_name}' updated successfully.`,
            updated: updates
        });
    } catch (err) {
        console.error("Error updating contact:", err);
        res.status(500).json({ message: "Internal Server Error" });
    } finally {
        await client.close();
    }
});



// Start the server
app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});

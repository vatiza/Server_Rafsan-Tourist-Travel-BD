const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const {
  createPayment,
  executePayment,
  queryPayment,
  searchTransaction,
  refundTransaction,
} = require("bkash-payment");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
//middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ub65wqu.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const bkashConfig = {
  base_url: process.env.VITE_BASE_URL,
  username: process.env.VITE_USERNAME,
  password: process.env.VITE_PASSWORD,
  app_key: process.env.VITE_APP_KEY,
  app_secret: process.env.VITE_APP_SECRET,
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const carouselCollections = client
      .db("RafsanToursTravelsDB")
      .collection("carousel");
    const placesCollection = client
      .db("RafsanToursTravelsDB")
      .collection("places");
    const testimonialsCollections = client
      .db("RafsanToursTravelsDB")
      .collection("testimonials");
    const userCollections = client
      .db("RafsanToursTravelsDB")
      .collection("users");
    const bookingCollections = client
      .db("RafsanToursTravelsDB")
      .collection("booking");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollections.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollections.find().toArray();
      res.send(result);
    });
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded?.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollections.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollections.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollections.insertOne(user);
      res.send(result);
    });
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollections.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/places", async (req, res) => {
      const result = await placesCollection.find().toArray();
      res.send(result);
    });

    app.get("/places/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await placesCollection.findOne(query);
      res.send(result);
    });
    app.post("/places", async (req, res) => {
      const placesData = req.body;
      const result = await placesCollection.insertOne(placesData);
      res.send(result);
    });

    app.delete("/places/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await placesCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/booking", async (req, res) => {
      const email = req.query.email;
      const query = { cEmail: email };
      const result = await bookingCollections.find(query).toArray();
      res.send(result);
    });

    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollections.deleteOne(query);
      res.send(result);
    });
    app.post("/booking", async (req, res) => {
      const bookingInfo = req.body;
      const result = await bookingCollections.insertOne(bookingInfo);
      res.send(result);
    });
    app.get("/testimonials", async (req, res) => {
      const result = await testimonialsCollections.find().toArray();
      res.send(result);
    });

    app.get("/carousel", async (req, res) => {
      const result = await carouselCollections.find().toArray();
      res.send(result);
    });

    //Bkash Payment

    app.post("/bkash-checkout", async (req, res) => {
      try {
        const { amount, callbackURL, orderID, reference } = req.body;
        const paymentDetails = {
          amount: amount || 10, // your product price
          callbackURL: callbackURL, // your callback route
          orderID: orderID || "Order_101", // your orderID
          reference: reference || "1", // your reference
        };
        const result = await createPayment(bkashConfig, paymentDetails);
        res.status(200).send(result?.bkashURL);
      } catch (e) {
        console.log(e);
      }
    });

    app.get("/bkash-callback", async (req, res) => {
      try {
        const { status, paymentID } = req.query;
        let result;
        let response = {
          statusCode: "4000",
          statusMessage: "Payment Failed",
        };
        if (status === "success")
          result = await executePayment(bkashConfig, paymentID);

        if (result?.transactionStatus === "Completed") {
          // payment success
          // insert result in your db
        }
        if (result)
          response = {
            statusCode: result?.statusCode,
            statusMessage: result?.statusMessage,
          };

        res.redirect("http://localhost:5173/dashboard/mybooking");
      } catch (e) {
        console.log(e);
      }
    });

    // Add this route under admin middleware
    app.post("/bkash-refund", async (req, res) => {
      try {
        const { paymentID, trxID, amount } = req.body;
        const refundDetails = {
          paymentID,
          trxID,
          amount,
        };
        const result = await refundTransaction(bkashConfig, refundDetails);
        res.send(result);
      } catch (e) {
        console.log(e);
      }
    });

    app.get("/bkash-search", async (req, res) => {
      try {
        const { trxID } = req.query;
        const result = await searchTransaction(bkashConfig, trxID);
        res.send(result);
      } catch (e) {
        console.log(e);
      }
    });

    app.get("/bkash-query", async (req, res) => {
      try {
        const { paymentID } = req.query;
        const result = await queryPayment(bkashConfig, paymentID);
        res.send(result);
      } catch (e) {
        console.log(e);
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Rafsan is Running");
});

app.listen(port, () => {
  console.log("Rafsan  is running on port:", port);
});

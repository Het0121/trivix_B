import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import travelerRouter from './routes/traveler.routes.js';
import agencyRouter from './routes/agency.routes.js';
import followRouter from "./routes/follow.routes.js";
import postRouter from "./routes/post.routes.js";
import ownerRouter from "./routes/owner.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import likeRouter from "./routes/like.routes.js";
import commentRouter from "./routes/comment.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import packageRouter from "./routes/package.routes.js";
import bookingRouter from "./routes/booking.routes.js";
import staticRouter from "./controllers/static.js";

//routes declaration
app.use("/api/v1/traveler", travelerRouter);
app.use("/api/v1/agency", agencyRouter);
app.use("/api/v1/follow", followRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/agency/owner", ownerRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/packages", packageRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/static", staticRouter);

export { app }
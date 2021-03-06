const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const methodOverrride = require("method-override");

const app = express();

//Middleware
app.use(bodyParser.json());
app.use(methodOverrride("_method"));
app.set("view engine", "ejs");

//Mongo URI
const mongoURI =
  "mongodb://root:123456@ds155699.mlab.com:55699/mongo_fileupload";

//Create mongo connection
const conn = mongoose.createConnection(mongoURI);

//init gfs
let gfs;
conn.once("open", () => {
  //Init Stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

//Create Storage Engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads"
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

//@route GET
//@desc Load form
app.get("/", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      res.render("index", { files: false });
    } else {
      files.map(file => {
        if (
          file.contentType === "image/jpeg" ||
          file.contentType === "image/png"
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render("index", { files: files });
    }
  });
});

//@route POST /uploaad
//@desc Upload file to DB
app.post("/upload", upload.single("file"), (req, res) => {
  // res.json({ file: req.file });
  res.redirect("/");
});

//@route GET /files
//@desc Display all files in JSON
app.get("/files", (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files exists
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "No files exist"
      });
    }
    //Files exists
    return res.json(files);
  });
});

//@route GET /files/:filename
//@desc Display single file
app.get("/files/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists with this name"
      });
    }
    //File exist
    return res.json(file);
  });
});

//@route GET /image/:filename
//@desc Display image
app.get("/image/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists with this name"
      });
    }
    // Check if file is an image
    if (file.contentType === "image/jpeg" || file.contentType === "img/png") {
      //Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({ err: "File is not an Imaage" });
    }
  });
});

//@route DELETE /files/:id
//@desc Delete fike
app.delete('/files/:id', (req, res) => {
  gfs.remove(
    {
      _id: req.params.id,
      root: "uploads"
    },
    (err, gridStore) => {
      if (err) {
        return res.status(404).json({ err: err });
      }
      res.redirect("/");
    }
  );
});

const port = 5000;

app.listen(port, () => console.log(`Server start ${port}`));

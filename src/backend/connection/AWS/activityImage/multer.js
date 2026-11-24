const fs = require('node:fs');
const { directory } = require('../../activityMedia');
const aws = require("aws-sdk");
const crypto = require("crypto");
const multer = require("multer");
const multerS3 = require("multer-s3");

const storageTypes = {
    local: multer.diskStorage({
        destination: (req, file, cb) => {
            fs.mkdir(directory, { recursive: true }, (error) => cb(error, directory));
        },
        filename: (req, file, cb) => {
            crypto.randomBytes(16, (err, hash) => {
                if(err) cb(err);

                file.key = `${hash.toString('hex')}-${file.originalname}`;

                cb(null, file.key);
            })
        },
    }),

    s3: multerS3({
        s3: new aws.S3(),
        bucket: "kidphoto",
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'public-read',
        key: (req, file, cb) => {
            crypto.randomBytes(16, (err, hash) => {
                if(err) cb(err);

                file.key = `${hash.toString('hex')}-${file.originalname}`;

                cb(null, file.key);
            })
        }
    })
}

module.exports = {
    dest: directory,
    storage: storageTypes[process.env.STORAGE_TYPE],
    limits: {
        //fileSize: 2 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpg',
            'image/jpeg',
            'image/pjpeg',
            'image/png',
            'image/gif'
        ];

        if(allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type."));
        }
    }
}
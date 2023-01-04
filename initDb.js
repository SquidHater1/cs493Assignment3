/*
 * This file contains a simple script to populate the database with initial
 * data from the files in the data/ directory.
 */

const sequelize = require('./lib/sequelize')
const { Business, BusinessClientFields } = require('./models/business')
const { Photo, PhotoClientFields } = require('./models/photo')
const { Review, ReviewClientFields } = require('./models/review')
const { User, UserClientFields } = require('./models/user')

const businessData = require('./data/businesses.json')
const photoData = require('./data/photos.json')
const reviewData = require('./data/reviews.json')
const userData = require('./data/users.json')

sequelize.sync().then(async function () {
  await Business.bulkCreate(businessData, { fields: BusinessClientFields })
  await Photo.bulkCreate(photoData, { fields: PhotoClientFields })
  await Review.bulkCreate(reviewData, { fields: ReviewClientFields })
  await User.bulkCreate(userData, { fields: UserClientFields })
  await User.create( {
    name: "Administrator",
    email: "admin@root.com",
    password: "hunter2",
    admin: true
  }, UserClientFields)
})

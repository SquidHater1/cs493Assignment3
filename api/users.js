const { Router } = require('express')
const jwt = require('jsonwebtoken')
const { ValidationError } = require('sequelize')

const { Business } = require('../models/business')
const { Photo } = require('../models/photo')
const { Review } = require('../models/review')

const { User, UserClientFields } = require('../models/user')

const { generateAuthToken, requireAuthentication } = require('../lib/auth')
const bcrypt = require('bcryptjs/dist/bcrypt')

const router = Router()

const secretKey = 'SuperSecret'


/*
 * Route to create a new user.
 */
router.post('/', async function (req, res, next) {
  try {
    if(req.body.admin){
      
      //checking for admin authentication
      const authHeader = req.get('Authorization') || ''
      const authHeaderParts = authHeader.split(' ')

      const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null
      console.log("== Got token: ", token)

      try {
        const payload = jwt.verify(token, secretKey)
        req.user = payload.sub

        console.log("== Successfully authenticated")
        const isAdmin = await hasAdminAccess(req.user)
        console.log("== Checked for admin, result: ", isAdmin)
        if(isAdmin){
          const user = await User.create(req.body, UserClientFields)
          console.log("== Created the user")
          res.status(201).send({ id: user.id })
        }else{
          res.status(403).json({
            error: "Unauthorized to create user with administrator privelages"
          })
        }

      } catch (err) {
        res.status(401).json({
          error: "Invalid authentication token provided",
          errortext: err
        })
      }

      
    }else{
      const user = await User.create(req.body, UserClientFields)
      res.status(201).send({ id: user.id })
    }
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).send({ error: e.message })
    } else {
      throw e
    }
  }
})

function checkForAdminAuthentication(req, res){

}

async function hasAdminAccess(reqUser){
  const tempUser = await getUserById(reqUser, false)
  const isAdmin = tempUser.admin
  return isAdmin
}

//helper function for checking if user has access
async function userHasAccess(reqUser, targetId){
  console.log("== Got req.user: ", reqUser)
  console.log("== Got req.params.userid: ", targetId)
  const tempUser = await getUserById(reqUser, false)
  console.log("== Got user to check for admin: ", tempUser)
  const isAdmin = tempUser.admin
  console.log("== Got admin flag value: ", isAdmin)
  return !(reqUser != targetId && isAdmin != true)
}

/*
 * Route to get a user by id
 */

router.get('/:userId', requireAuthentication, async function (req, res) {
  
  //const tempUser = await getUserById(req.user, false)
  
  //const isAdmin = tempUser.admin
  const hasAccess = await userHasAccess(req.user, req.params.userId)
  
  if( !hasAccess ){
    res.status(403).json({
      error: "Unauthorized to access the specified resource"
    })
  }else{

    const userId = req.params.userId
    try {
      const thisUser = await getUserById(userId, false)
      res.status(200).json({
        user: thisUser
      })
    } catch (e) {
      if (e instanceof ValidationError) {
        res.status(400).send({ error: e.message })
      } else {
        throw e
      }
    }

  }
})

//get user helper function
async function getUserById(userId, includePassword){
  if(includePassword){
    const thisUser = await User.findByPk(userId)
    return thisUser
  }else{
    const thisUser = await User.findByPk(userId, {
      attributes: {exclude: ['password']}
    })
    return thisUser
  }
}

async function getUserByEmail(email){
  const thisUser = await User.findOne({
    where: {email: email}
  })
  return thisUser
}

/*
 * Route to allow a user to login
 */

router.post('/login', async function (req, res, next) {
  if (req.body && req.body.email && req.body.password) {

    try {
      const thisUser = await getUserByEmail(req.body.email)
      const userId = thisUser.id
      const authenticated = await validateUser(userId, req.body.password)
      console.log("== Got value of authenticated: ",authenticated)
      if (authenticated) {
        const token = generateAuthToken(userId)
        res.status(200).send({token: token})
      } else {
        res.status(401).send({
          error: "Invalid authentication credentials"
        })
      }

    } catch (err) {
      res.status(500).send({
        error: "Error logging in.  Try again later."
      });
    }

  }else{
    res.status(400).json({
      error: "Request body needs user ID and password."
    });
  }
})

//login helper function
async function validateUser(id, password){
  const thisUser = await getUserById(id, true)
  console.log("== Got User: ", thisUser.name)
  console.log("== Password: ", thisUser.password)
  if(thisUser){
    console.log("== User for sure exists")
  }
  const temp = await bcrypt.compare(password, thisUser.password)
  console.log("== successfully compared")
  if(thisUser && await bcrypt.compare(password, thisUser.password)){
    return true
  }else{
    return false
  }
}


/*
 * Route to list all of a user's businesses.
 */
router.get('/:userId/businesses', requireAuthentication, async function (req, res) {
  const hasAccess = await userHasAccess(req.user, req.params.userId)
  
  if( !hasAccess ){
    res.status(403).json({
      error: "Unauthorized to access the specified resource"
    })
  }else{
    const userId = req.params.userId
    const userBusinesses = await Business.findAll({ where: { ownerId: userId }})
    res.status(200).json({
      businesses: userBusinesses
    })
  }
})

/*
 * Route to list all of a user's reviews.
 */
router.get('/:userId/reviews', requireAuthentication, async function (req, res) {
  const hasAccess = await userHasAccess(req.user, req.params.userId)
  
  if( !hasAccess ){
    res.status(403).json({
      error: "Unauthorized to access the specified resource"
    })
  }else{
    const userId = req.params.userId
    const userReviews = await Review.findAll({ where: { userId: userId }})
    res.status(200).json({
      reviews: userReviews
    })
  }
})

/*
 * Route to list all of a user's photos.
 */
router.get('/:userId/photos', requireAuthentication, async function (req, res) {
  const hasAccess = await userHasAccess(req.user, req.params.userId)
  
  if( !hasAccess ){
    res.status(403).json({
      error: "Unauthorized to access the specified resource"
    })
  }else{
    const userId = req.params.userId
    const userPhotos = await Photo.findAll({ where: { userId: userId }})
    res.status(200).json({
      photos: userPhotos
    })
  }
})

module.exports = router

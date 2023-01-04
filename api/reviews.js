const { Router } = require('express')
const { ValidationError } = require('sequelize')
const { requireAuthentication } = require('../lib/auth')

const { Review, ReviewClientFields } = require('../models/review')
const { User } = require('../models/user')

const router = Router()

/*
 * Route to create a new review.
 */
router.post('/', requireAuthentication, async function (req, res, next) {
  try {
    const hasAccess = await userHasAccess(req.user, req.body.userId)
    if(!hasAccess){
      res.status(403).json({
        error: "Unauthorized to create resource for specified user"
      })
    }else{
      const review = await Review.create(req.body, ReviewClientFields)
      res.status(201).send({ id: review.id })
    }
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).send({ error: e.message })
    } else {
      throw e
    }
  }
})

/*
 * Route to fetch info about a specific review.
 */
router.get('/:reviewId', async function (req, res, next) {
  const reviewId = req.params.reviewId
  const review = await Review.findByPk(reviewId)
  if (review) {
    res.status(200).send(review)
  } else {
    next()
  }
})

//helper function for checking if user has access
async function userHasAccess(reqUser, targetId){
  console.log("== Got reqUser: ", reqUser)
  console.log("== Got targetId: ", targetId)
  const tempUser = await getUserById(reqUser, false)
  console.log("== Got user to check for admin: ", tempUser)
  const isAdmin = tempUser.admin
  console.log("== Got admin flag value: ", isAdmin)
  return !(reqUser != targetId && isAdmin != true)
}

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
 * Route to update a review.
 */
router.patch('/:reviewId', requireAuthentication, async function (req, res, next) {
  const reviewId = req.params.reviewId
  const thisReview = await Review.findOne({
    where: {id: reviewId}
  })
  const hasAccess = await userHasAccess(req.user, thisReview.userId)

  if(!hasAccess){
    res.status(403).json({
      error: "Unauthorized to update resource for specified user"
    })
  }else{
    /*
    * Update review without allowing client to update businessId or userId.
    */
    const result = await Review.update(req.body, {
      where: { id: reviewId },
      fields: ReviewClientFields.filter(
        field => field !== 'businessId' && field !== 'userId'
      )
    })
    if (result[0] > 0) {
      res.status(204).send()
    } else {
      next()
    }
  }
})

/*
 * Route to delete a review.
 */
router.delete('/:reviewId', requireAuthentication, async function (req, res, next) {
  const reviewId = req.params.reviewId
  const thisReview = await Review.findOne({
    where: {id: reviewId}
  })
  const hasAccess = await userHasAccess(req.user, thisReview.userId)

  if(!hasAccess){
    res.status(403).json({
      error: "Unauthorized to delete resource for specified user"
    })
  }else{
    const result = await Review.destroy({ where: { id: reviewId }})
    if (result > 0) {
      res.status(204).send()
    } else {
      next()
    }
  }
})

module.exports = router

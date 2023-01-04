const { Router } = require('express')
const { ValidationError } = require('sequelize')
const { requireAuthentication } = require('../lib/auth')

const { Photo, PhotoClientFields } = require('../models/photo')
const { User } = require('../models/user')

const router = Router()

/*
 * Route to create a new photo.
 */
router.post('/', requireAuthentication, async function (req, res, next) {
  try {
    const hasAccess = await userHasAccess(req.user, req.body.userId)
    if(!hasAccess){
      res.status(403).json({
        error: "Unauthorized to create resource for specified user"
      })
    }else{
      const photo = await Photo.create(req.body, PhotoClientFields)
      res.status(201).send({ id: photo.id })
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
 * Route to fetch info about a specific photo.
 */
router.get('/:photoId', async function (req, res, next) {
  const photoId = req.params.photoId
  const photo = await Photo.findByPk(photoId)
  if (photo) {
    res.status(200).send(photo)
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
 * Route to update a photo.
 */
router.patch('/:photoId', requireAuthentication, async function (req, res, next) {
  const photoId = req.params.photoId
  const thisPhoto = await Photo.findOne({
    where: {id: photoId}
  })
  const hasAccess = await userHasAccess(req.user, thisPhoto.userId)

  if(!hasAccess){
    res.status(403).json({
      error: "Unauthorized to update resource for specified user"
    })
  }else{
    /*
    * Update photo without allowing client to update businessId or userId.
    */
    const result = await Photo.update(req.body, {
      where: { id: photoId },
      fields: PhotoClientFields.filter(
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
 * Route to delete a photo.
 */
router.delete('/:photoId', requireAuthentication, async function (req, res, next) {
  const photoId = req.params.photoId
  const thisPhoto = await Photo.findOne({
    where: {id: photoId}
  })
  const hasAccess = await userHasAccess(req.user, thisPhoto.userId)

  if(!hasAccess){
    res.status(403).json({
      error: "Unauthorized to delete resource for specified user"
    })
  }else{
    const result = await Photo.destroy({ where: { id: photoId }})
    if (result > 0) {
      res.status(204).send()
    } else {
      next()
    }
  }
})

module.exports = router

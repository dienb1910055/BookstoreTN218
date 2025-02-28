import bcrypt from 'bcrypt'
import { validationResult } from 'express-validator'
import mailer from '../../util/mailer.js'

import User from '../models/user.js'
import Book from '../models/book.js'


class AuthController {
    // [GET] /register
    register(req, res, next) {
        if (req.session.User)
            return res.redirect('/')
        return res.render('guest/auth/register', { layout: 'guest/layouts/main', data: {}, errors: [] })
    }


    // [POST] /register
    async addUser(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty())
            return res.render('guest/auth/register', { data: req.body, errors: errors.array() })
        try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10)
            // await User.create({ email: req.body.email, password: hashedPassword, fullName: req.body.fullName })
            const user = await User.create({ email: req.body.email, password: hashedPassword, fullName: req.body.fullName })
            bcrypt.hash(user.email, parseInt(process.env.BCRYPT_SALT_ROUND)).then((hashedEmail) => {
                // console.log(${ process.env.APP_URL } / verify ? email = ${ user.email } & token=${ hashedEmail });
                mailer(
                    user.email,
                    "Verify Email",
                    `<h1 style="color:blue;text-align:center;">This is a heading</h1>
                  <a href="${process.env.APP_URL}/auth/verify?email=${user.email}&token=${hashedEmail}"> Verify </a>`
                );
            });
            return res.redirect('/auth/login')
        } catch (error) {
            next(error)
        }
    }

    // [GET] /login
    login(req, res, next) {
        if (req.session.user)
            return res.redirect('/')
        return res.render('guest/auth/login', { errors: {}, data: {} })
    }

    // [POST] /login
    async authenticate(req, res, next) {
        try {
            const user = await User.findOne({ where: { email: req.body.email } })
            if (!user) return res.render('guest/auth/login', { errors: { email: 'User with that email does not exist' }, data: req.body })
            const isCorrectPassword = await bcrypt.compare(req.body.password, user.password)
            if (!isCorrectPassword) return res.render('auth/login', { errors: { password: 'Password is not correct' }, data: req.body })
            if (user.email_verified < 1) return res.render("guest/auth/login", { errors: { verified: 'This account is not verified' }, data: {} });
            req.session.user = user.dataValues
            return res.redirect('/')
        } catch (error) {
            next(error)
        }
    }

    // [GET] /auth/logout
    logout(req, res, next) {
        req.session.destroy();
        return res.redirect('/')
    }

    verify(req, res) {
        console.log(req.query.email + " " + req.query.token);
        bcrypt.compare(req.query.email, req.query.token, (err, result) => {
            if (result == true) {
                const user = User.update({ email_verified: 1 }, { where: { email: req.query.email } });
                return res.redirect('/auth/login')
            } else {
                return res.render("auth/login", { errors: {}, data: {} });
            }
        });
    }
}

export default new AuthController()
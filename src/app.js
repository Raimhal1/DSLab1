const express = require('express')
const http = require('http')
const socketio = require('socket.io')

const {generateMessage, generateLocationMessage} = require("./utils/messages")
const {addUser, removeUser, getUser, getUsersInRoom, getUserByUsername} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)


app.use(express.static(__dirname + '/../public'));

io.on('connection', (socket) => {

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', `Welcome, ${user.username}!`))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)

        io.to(user?.room).emit('message', generateMessage(user.username, message))

        callback()
    })

    socket.on('sendPrivateMessage', (message, username, callback) => {

        const user = getUser(socket.id)
        const toUser = getUserByUsername(username)

        io.to(toUser?.id).emit('message', generateMessage(user.username, message))

        callback()

    })

    socket.on('typing', () => {
        const user = getUser(socket.id)
        socket.broadcast.to(user?.room).emit('typing', user.username)
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                users: getUsersInRoom(user.room)
            })
        }
    })
});


server.listen(3000, function () {
    console.log('listening on *:3000');
});

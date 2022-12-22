import * as dotenv from 'dotenv';
import { CosmosClient } from "@azure/cosmos";
import { DatabaseCreds } from "./config.js";
import {sendrequest} from "../src/adafruitrequest.js";
import * as  url  from 'url'
import { default as jwt } from "jsonwebtoken";
import { default as bcrypt } from 'bcryptjs'
dotenv.config();

const DatabaseCred = new DatabaseCreds()

const options = {
    endpoint: DatabaseCred.endpoint,
    key: DatabaseCred.key,
    userAgentSuffix: DatabaseCred.userAgentSuffix
};


const client = new CosmosClient(options)

export class DatabaseConnection {

    constructor() {
        this.client = new CosmosClient(options)
    }

    async getlogin(request) {
        let querySpec = null;
        if (request && request.body && request.body.USERNAME && request.body.PASSWORD)
            querySpec = {
                query: 'SELECT * FROM root r WHERE r.id = @id and r.confirmed = "YES"',
                parameters: 
                [
                    {
                        name: '@id',
                        value: request.body.USERNAME
                    }
                ]
            }
        else {
            throw "No USERNAME/PASSWORD post var Found in request"
        }

        const { resources: results } = await client
        .database(DatabaseCred.database)
        .container(DatabaseCred.container.user.id)
        .items.query(querySpec)
        .fetchNext()

        if (results.length != 1){
            throw 'valid user not found';
        }
        

        if (bcrypt.compareSync(request.body.PASSWORD, results[0].password)){
            return {responsecode : 200, responsedata : results[0] , errormsg: ''}
        }
        else {
            throw 'invalid password';
        } 
    }

    async setJWTtoken(useritem) {
        const token = jwt.sign(
            { user_id: useritem.id},
                process.env.TOKEN_KEY,
                {expiresIn: "7d"}
            );
        useritem.RefreshToken = token

        const { resource: results } = await client
        .database(DatabaseCred.database)
        .container(DatabaseCred.container.user.id)
        .item(useritem.id, useritem.partitionKey)
        .replace(useritem);

        // response.cookie('userjwt',token, { maxAge: 604800, httpOnly: true });

        if (results.RefreshToken == token)
            return {responsecode : 200, responsedata : [useritem, results], errormsg: ''};
        else
            throw 'error generating saving tokens';
    }

    async getactions(request) {
        const querySpec = {
        query: 'SELECT r.actions FROM root r WHERE r.id = @id',
        parameters: [
            {
            name: '@id',
            value: request.username
            }
        ]
        }
            ///test
          const { resources: results } = await client
          .database(DatabaseCred.database)
          .container(DatabaseCred.container.user.id)
          .items.query(querySpec)
          .fetchNext()
          
        if (results.length != 1){
            throw 'no config found';
        }
        return {responsecode : 200, responsedata : results[0], errormsg: ''};
    }

    async verifytoken(user_id, token) {
        const querySpec = {
        query: 'SELECT RefreshToken FROM root r WHERE r.id = @id',
        parameters: [
            {
            name: '@id',
            value: request.username
            }
        ]
        }
            ///test
          const { resources: results } = await client
          .database(DatabaseCred.database)
          .container(DatabaseCred.container.user.id)
          .items.query(querySpec)
          .fetchNext()
          
        if (results.length != 1){
            throw 'no tokan found';
        }
        if (safeCompare(token = results.RefreshToken))
            return {responsecode : 200, responsedata : results[0], errormsg: ''};
        else 
            throw 'invalid token';
    }


    async verifyaction(userid, actions) {
        let querySpec = null;
        querySpec = {
                query: 'SELECT * FROM root r WHERE r.id = @id and r.confirmed = "YES"',
                parameters: 
                [
                    {
                        name: '@id',
                        value: userid
                    }
                ]
            }


        const { resources: results } = await client
        .database(DatabaseCred.database)
        .container(DatabaseCred.container.user.id)
        .items.query(querySpec)
        .fetchNext()

        if (results.length != 1){
            throw 'valid user not found';
        }
        return {responsecode : 200, responsedata : results[0] , errormsg: ''}
    }

    async getsendID(action, scope) {
        const querySpec = {
            query: 'SELECT r.send_id FROM root r WHERE r.id = @id and r.partitionKey = @scope',
            parameters: [
                {
                    name: '@id',
                    value: action
                },
                {
                    name: '@scope',
                    value: scope
                }
            ]
        }

        const { resources: results } = await client
        .database(DatabaseCred.database)
        .container(DatabaseCred.container.actions.id)
        .items.query(querySpec)
        .fetchNext()
        
        if (results.length != 1){
            throw 'valid user not found';
        }
        return results[0]

    }

}

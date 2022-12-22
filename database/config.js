import * as dotenv from 'dotenv';
dotenv.config();

export class DatabaseCreds {

  endpoint = process.env.DB_END_POINT
  key = process.env.COSMO_DB_KEY
  userAgentSuffix = 'CosmosDBhomealarm'
  database = 'homealarm'


  container = {
    user:{
      id: 'users'
    },
    actions:{
    id: 'actions'
    }
  }
}
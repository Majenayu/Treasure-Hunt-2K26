// Script to add teams 51-55 to MongoDB
// Run with: node add-teams-51-55.js

const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb+srv://pra:pra@pra.si69pt4.mongodb.net/?appName=pra';
const DB_NAME = 'codehunt';

async function addMissingTeams() {
  console.log('🔌 Connecting to MongoDB...');
  
  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    tls: true,
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const teamsCol = db.collection('teams');
    
    // Check which teams already exist
    const existingTeams = await teamsCol.find({ teamId: { $in: [51, 52, 53, 54, 55] } }).toArray();
    const existingIds = new Set(existingTeams.map(t => t.teamId));
    
    console.log(`\n📊 Current status:`);
    console.log(`   Existing teams (51-55): ${existingTeams.map(t => t.teamId).join(', ') || 'None'}`);
    
    const teamsToAdd = [];
    for (let i = 51; i <= 55; i++) {
      if (!existingIds.has(i)) {
        teamsToAdd.push({
          teamId: i,
          name: `Team ${i}`,
          password: 'codehunt',
          category: 'unset',
          difficultyOverride: null,
          members: [],
          registered: false,
          player1Name: '',
          player1Year: '',
          player1College: '',
          player2Name: '',
          player2Year: '',
          player2College: ''
        });
      }
    }
    
    if (teamsToAdd.length === 0) {
      console.log('\n✅ All teams 51-55 already exist! Nothing to add.');
    } else {
      console.log(`\n➕ Adding ${teamsToAdd.length} teams: ${teamsToAdd.map(t => t.teamId).join(', ')}`);
      
      await teamsCol.insertMany(teamsToAdd);
      
      console.log('✅ Teams added successfully!');
    }
    
    const totalTeams = await teamsCol.countDocuments();
    console.log(`\n📈 Total teams in database: ${totalTeams}`);
    
    console.log('\n🎉 Done! Teams 51-55 can now login with:');
    console.log('   Username: 51, 52, 53, 54, or 55');
    console.log('   Password: codehunt');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

addMissingTeams();

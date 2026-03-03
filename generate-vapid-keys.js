const webpush = require('web-push');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n===========================================');
console.log('📢 VAPID Keys Generated Successfully!');
console.log('===========================================\n');

console.log('Public Key:');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key:');
console.log(vapidKeys.privateKey);

console.log('\n===========================================');
console.log('📋 Copy these to Railway Environment Variables:');
console.log('===========================================\n');

console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);

console.log('\n===========================================');
console.log('✅ Done! Add these to Railway dashboard.');
console.log('===========================================\n');

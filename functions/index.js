const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

async function deleteQueryDocuments(collectionPath, userId) {
  const queryRef = db.collection(collectionPath).where('userId', '==', userId).limit(500);

  while (true) {
    const snapshot = await queryRef.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    if (snapshot.size < 500) break;
  }
}

exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  const userId = data?.userId;
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.');
  }
  if (!userId || typeof userId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'A valid userId is required.');
  }

  const callerUid = context.auth.uid;
  const callerDoc = await db.collection('users').doc(callerUid).get();
  const callerData = callerDoc.data() || {};

  if (!Array.isArray(callerData.roles) || !callerData.roles.includes('admin')) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can delete accounts.');
  }

  if (callerUid === userId) {
    throw new functions.https.HttpsError('failed-precondition', 'Admin cannot delete their own account through this endpoint.');
  }

  try {
    await deleteQueryDocuments('transactions', userId);
    await deleteQueryDocuments('goals', userId);
    await deleteQueryDocuments('recurring', userId);

    await db.collection('users').doc(userId).delete();
    await auth.deleteUser(userId);

    return { success: true };
  } catch (error) {
    console.error('deleteUserAccount error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    const message = error?.message || 'Failed to delete user account.';
    throw new functions.https.HttpsError('internal', `Failed to delete user account: ${message}`, {
      originalError: message,
      stack: error?.stack || null,
    });
  }
});

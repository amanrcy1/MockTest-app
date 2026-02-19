/**
 * Firebase Cloud Functions for Mockzam
 * 
 * Setup:
 * 1. npm install -g firebase-tools
 * 2. firebase init functions
 * 3. cd functions && npm install
 * 4. firebase deploy --only functions
 */

require('dotenv').config();
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * Update question counts when a question is added
 */
exports.onQuestionCreate = functions.firestore
  .document('questions/{questionId}')
  .onCreate(async (snap, context) => {
    const question = snap.data();
    const examType = question.examType;
    
    if (!examType) return null;
    
    const statsRef = db.collection('questionStats').doc('counts');
    
    return db.runTransaction(async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      
      if (!statsDoc.exists) {
        transaction.set(statsRef, {
          [examType]: 1,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        const currentCount = statsDoc.data()[examType] || 0;
        transaction.update(statsRef, {
          [examType]: currentCount + 1,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });
  });

/**
 * Update question counts when a question is deleted
 */
exports.onQuestionDelete = functions.firestore
  .document('questions/{questionId}')
  .onDelete(async (snap, context) => {
    const question = snap.data();
    const examType = question.examType;
    
    if (!examType) return null;
    
    const statsRef = db.collection('questionStats').doc('counts');
    
    return db.runTransaction(async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      
      if (statsDoc.exists) {
        const currentCount = statsDoc.data()[examType] || 0;
        transaction.update(statsRef, {
          [examType]: Math.max(0, currentCount - 1),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });
  });

/**
 * Update question counts when exam type changes
 */
exports.onQuestionUpdate = functions.firestore
  .document('questions/{questionId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    const oldExamType = before.examType;
    const newExamType = after.examType;
    
    // Only update if exam type changed
    if (oldExamType === newExamType) return null;
    
    const statsRef = db.collection('questionStats').doc('counts');
    
    return db.runTransaction(async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      
      if (statsDoc.exists) {
        const updates = {
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        if (oldExamType) {
          const oldCount = statsDoc.data()[oldExamType] || 0;
          updates[oldExamType] = Math.max(0, oldCount - 1);
        }
        
        if (newExamType) {
          const newCount = statsDoc.data()[newExamType] || 0;
          updates[newExamType] = newCount + 1;
        }
        
        transaction.update(statsRef, updates);
      }
    });
  });

/**
 * Clean up old test sessions (run daily)
 */
exports.cleanupOldSessions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    
    const oldTests = await db.collection('tests')
      .where('completed', '==', false)
      .where('startTime', '<', sixHoursAgo.toISOString())
      .get();
    
    const batch = db.batch();
    oldTests.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`Cleaned up ${oldTests.size} old test sessions`);
    return null;
  });

/**
 * Generate AI explanation for wrong answers
 * Securely calls Groq API from server-side
 */
exports.generateAIExplanation = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to use AI explanations'
    );
  }

  // Validate input
  const { questionText, options, correctAnswer, userAnswer, subject, topic } = data;
  
  if (!questionText || !options || !correctAnswer || !userAnswer) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields'
    );
  }

  // Get API key from environment config
  const groqApiKey = process.env.GROQ_API_KEY || functions.config().groq?.key;
  
  if (!groqApiKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'AI service not configured'
    );
  }

  // Rate limiting check
  const userId = context.auth.uid;
  const rateLimitRef = db.collection('aiRateLimits').doc(userId);
  
  try {
    // Check rate limit
    const rateLimitDoc = await rateLimitRef.get();
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    if (rateLimitDoc.exists) {
      const limitData = rateLimitDoc.data();
      
      if (now < limitData.resetAt && limitData.count >= 5) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Too many AI requests. Please wait a moment.'
        );
      }
      
      if (now > limitData.resetAt) {
        await rateLimitRef.set({ count: 1, resetAt: now + oneMinute });
      } else {
        await rateLimitRef.update({ count: limitData.count + 1 });
      }
    } else {
      await rateLimitRef.set({ count: 1, resetAt: now + oneMinute });
    }

    // Build prompt
    const prompt = `You are an expert tutor. A student got this question wrong. Give a brief, clear explanation.

Question: ${questionText}
Correct Answer: ${correctAnswer}. ${options[correctAnswer]}
Student's Answer: ${userAnswer}. ${options[userAnswer]}
Subject: ${subject} | Topic: ${topic}

Provide a SHORT explanation (max 80 words):
1. Why the correct answer is right (key fact)
2. One memory tip to remember this

Be direct. No fluff. No "Hey there" or encouragement. Just facts.`;

    // Call Groq API
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an expert tutor. Be concise and direct.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Groq API Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to generate explanation'
      );
    }

    const result = await response.json();
    const explanation = result.choices[0].message.content;

    // Log usage for analytics
    await db.collection('aiUsage').add({
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      subject,
      topic,
    });

    return { explanation };

  } catch (error) {
    console.error('AI Explanation Error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate explanation. Please try again.'
    );
  }
});

/**
 * Rate limiting for AI requests (callable function)
 */
exports.checkAIRateLimit = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }
  
  const userId = context.auth.uid;
  const rateLimitRef = db.collection('aiRateLimits').doc(userId);
  
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(rateLimitRef);
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    if (!doc.exists) {
      transaction.set(rateLimitRef, {
        count: 1,
        resetAt: now + oneMinute,
      });
      return { allowed: true, remaining: 9 };
    }
    
    const data = doc.data();
    
    // Reset if time window passed
    if (now > data.resetAt) {
      transaction.update(rateLimitRef, {
        count: 1,
        resetAt: now + oneMinute,
      });
      return { allowed: true, remaining: 9 };
    }
    
    // Check limit (10 per minute)
    if (data.count >= 10) {
      return { 
        allowed: false, 
        remaining: 0,
        resetIn: Math.ceil((data.resetAt - now) / 1000),
      };
    }
    
    transaction.update(rateLimitRef, {
      count: data.count + 1,
    });
    
    return { allowed: true, remaining: 10 - data.count - 1 };
  });
});

/**
 * Generate weekly leaderboard (run every Monday at 00:00)
 */
exports.generateWeeklyLeaderboard = functions.pubsub
  .schedule('0 0 * * 1')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const tests = await db.collection('tests')
      .where('completed', '==', true)
      .where('endTime', '>=', oneWeekAgo.toISOString())
      .get();
    
    // Group by exam type and calculate top scores
    const leaderboards = {};
    
    tests.docs.forEach((doc) => {
      const test = doc.data();
      const examType = test.examType;
      
      if (!leaderboards[examType]) {
        leaderboards[examType] = {};
      }
      
      const userId = test.userId;
      const existing = leaderboards[examType][userId];
      
      if (!existing || test.score > existing.score) {
        leaderboards[examType][userId] = {
          userId,
          score: test.score,
          accuracy: test.accuracy,
          timeTaken: test.timeTaken,
          testId: doc.id,
        };
      }
    });
    
    // Save leaderboards
    const batch = db.batch();
    
    Object.entries(leaderboards).forEach(([examType, users]) => {
      const sorted = Object.values(users)
        .sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken)
        .slice(0, 100); // Top 100
      
      const leaderboardRef = db.collection('leaderboards').doc(`${examType}_weekly`);
      batch.set(leaderboardRef, {
        examType,
        period: 'weekly',
        data: sorted,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    
    await batch.commit();
    
    console.log('Weekly leaderboards generated');
    return null;
  });

# 📚 Mockzam

> A comprehensive, feature-rich mock test platform designed for UPSC aspirants to practice and excel in their exam preparation.

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=for-the-badge)](https://amanrcy.vercel.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

## � Live Demo

**[View Live Application →](https://amanrcy.vercel.app)**

---

## ✨ Features

### 🎯 Core Functionality
- **Multiple Test Modes** - Mock tests, Practice mode, and Custom tests
- **Comprehensive Question Bank** - Prelims, Mains, and Optional subjects
- **Real-time Scoring** - Instant results with detailed analytics
- **Performance Tracking** - Track progress over time with visual charts

### 👤 User Experience
- **Secure Authentication** - Email/password with Firebase Auth
- **Personalized Dashboard** - View stats, history, and bookmarks
- **Leaderboard System** - Compete with other aspirants
- **Bookmark Questions** - Save questions for later review

### 🎨 Design & Interface
- **Dark/Light Theme** - Toggle between themes for comfortable studying
- **Responsive Design** - Seamless experience on desktop, tablet, and mobile
- **Smooth Animations** - Engaging visual effects using Framer Motion
- **Intuitive Navigation** - Easy-to-use interface with keyboard shortcuts

### 🛡️ Security & Performance
- **Anti-cheat System** - Tab switching and copy-paste detection
- **Optimized Performance** - Code splitting and lazy loading
- **Secure Data** - Firebase security rules and data validation
- **Error Tracking** - Comprehensive error logging and reporting

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library for smooth transitions
- **React Toastify** - Toast notifications

### Backend & Services
- **Firebase Authentication** - User management
- **Cloud Firestore** - NoSQL database
- **Vercel** - Hosting and serverless functions
- **Groq API** - AI-powered explanations (via serverless function)

### Development Tools
- **Jest** - Unit testing framework
- **React Testing Library** - Component testing
- **ESLint** - Code linting
- **Prettier** - Code formatting

---

## 📦 Installation

### Prerequisites
- Node.js 16+ and npm
- Firebase account
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/amanrcy1/mockzam.git
   cd mockzam
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your Firebase credentials and API settings:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   VITE_API_URL=/api
   GROQ_API_KEY=your_groq_api_key
   ```

4. **Start development server**
   ```bash
   npm start
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

---

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel (Recommended)
```bash
vercel
```

The platform is optimized for Vercel deployment with serverless functions in the `/api` directory for AI-powered explanations.

### Alternative: Deploy to Firebase
```bash
firebase login
firebase deploy --only hosting
```

Note: If deploying to Firebase, you'll need to migrate the `/api/ai-explanation.js` serverless function to Firebase Cloud Functions.

---

## 📁 Project Structure

```
mockzam/
├── api/                   # Vercel serverless functions
├── public/                # Static files
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── 3d/           # Animated components (Framer Motion)
│   │   ├── layout/       # Layout components
│   │   ├── test/         # Test-related components
│   │   └── ui/           # UI components
│   ├── pages/            # Page components
│   │   ├── admin/        # Admin pages
│   │   ├── auth/         # Authentication pages
│   │   ├── test/         # Test pages
│   │   └── user/         # User pages
│   ├── context/          # React Context providers
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API services
│   ├── utils/            # Utility functions
│   ├── config/           # Configuration files
│   └── constants/        # Constants and enums
├── functions/            # Firebase Cloud Functions (optional)
└── scripts/              # Utility scripts
```

---

## 🎯 Key Features Explained

### Test Modes

1. **Mock Test** - Simulate real UPSC exam conditions with time limits
2. **Practice Mode** - Practice without time pressure, see answers immediately
3. **Custom Test** - Create personalized tests by selecting subjects and topics

### Admin Panel

- Add/Edit/Delete questions
- Bulk upload via CSV
- View user statistics
- Manage error reports
- Monitor system health

### Analytics Dashboard

- Test history with detailed breakdowns
- Subject-wise performance analysis
- Time management insights
- Accuracy trends over time

---

## 🗺️ Roadmap

- [x] Core test functionality
- [x] User authentication and profiles
- [x] Leaderboard system
- [x] Dark/light theme
- [x] Mobile responsive design
- [x] AI-powered explanations (Groq API integration)
- [ ] Offline mode support
- [ ] Mobile app (React Native)
- [ ] Video solutions for questions
- [ ] Discussion forum
- [ ] Study planner and reminders

## ❓ FAQ

<details>
<summary><b>Is this platform free to use?</b></summary>
<br>
Yes, the platform is completely free for all users.
</details>

<details>
<summary><b>How do I become an admin?</b></summary>
<br>
Contact the repository owner or check the documentation for admin setup instructions.
</details>

<details>
<summary><b>Can I contribute questions?</b></summary>
<br>
Yes! You can contribute questions through pull requests or contact the admin.
</details>

<details>
<summary><b>Is my data secure?</b></summary>
<br>
Yes, all data is stored securely in Firebase with proper security rules and encryption.
</details>

<details>
<summary><b>Can I use this for other competitive exams?</b></summary>
<br>
Yes, the platform can be customized for any competitive exam by modifying the question bank.
</details>

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Aman Yadav**

- Website: [amanrcy.vercel.app](https://amanrcy.vercel.app)
- GitHub: [@amanrcy1](https://github.com/amanrcy1)
- LinkedIn: [amanrcy](https://linkedin.com/in/amanrcy)

---

## 🙏 Acknowledgments

- UPSC aspirants community for feedback and suggestions
- Firebase for backend infrastructure
- React community for excellent documentation
- All contributors who helped improve this project

---

## 📧 Support

For support, open an issue in the repository or reach out via:
- 📧 Email: amanrcy1@gmail.com
- 💬 GitHub Issues: [Report a bug](https://github.com/amanrcy1/mockzam/issues)
- 🌐 Website: [amanrcy.vercel.app](https://amanrcy.vercel.app)

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ for UPSC Aspirants

</div>

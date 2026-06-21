import React, { useState } from "react";
import { X, CheckCircle, Sparkles } from "lucide-react";
import { updateOnboarding } from "../../../api/authApi";
import { getStoredToken, getStoredUser, saveAuthSession, getAuthStorageMode } from "../../../utils/authStorage";

function OnboardingForm({ onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    profession: "",
    interests: [],
    goals: "",
    expectations: "",
    communicationStyle: "Supportive",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleInterestToggle = (interest) => {
    setFormData((prev) => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests };
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await updateOnboarding(formData);
      
      // Update active storage user object
      const localUser = getStoredUser() || {};
      saveAuthSession({
        token: getStoredToken(),
        user: {
          ...localUser,
          onboardingStatus: "completed",
          preferences: formData
        },
        rememberMe: getAuthStorageMode() === "localStorage"
      });

      onComplete();
    } catch (err) {
      console.error("Onboarding error:", err);
    } finally {
      setLoading(false);
    }
  };

  const interestsOptions = [
    "Productivity", "Mental Health", "Coding", "Business", 
    "Creative Writing", "Fitness", "Learning", "Leadership"
  ];

  const styles = [
    { id: "Direct", label: "Direct & Concise", desc: "No fluff, just the facts." },
    { id: "Supportive", label: "Supportive & Warm", desc: "Encouraging and empathetic partner." },
    { id: "Professional", label: "Professional", desc: "Standard business-friendly tone." },
    { id: "Casual", label: "Casual & Friendly", desc: "Like chatting with a smart friend." },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden relative border border-white/20">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100 dark:bg-gray-800">
          <div 
            className="h-full bg-blue-600 transition-all duration-500 ease-out" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-8 lg:p-12">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Sparkles size={14} />
                  Step 1: The Basics
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Let's get to know you.</h2>
                <p className="text-gray-500 dark:text-gray-400">Tell us a bit about your professional background.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">What is your profession/role?</label>
                  <input 
                    type="text" 
                    name="profession"
                    placeholder="e.g. Software Engineer, Student, Manager..."
                    value={formData.profession}
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">What topics interest you most?</label>
                  <div className="flex flex-wrap gap-2">
                    {interestsOptions.map(option => (
                      <button
                        key={option}
                        onClick={() => handleInterestToggle(option)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          formData.interests.includes(option)
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs font-bold uppercase tracking-wider">
                  <CheckCircle size={14} />
                  Step 2: Goals
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">What are you building?</h2>
                <p className="text-gray-500 dark:text-gray-400">Share your goals so the AI can help you reach them.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">What's your main focus right now?</label>
                  <textarea 
                    name="goals"
                    rows="3"
                    placeholder="e.g. Learning to code, getting fit, work project..."
                    value={formData.goals}
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">How can I best support you?</label>
                  <textarea 
                    name="expectations"
                    rows="3"
                    placeholder="e.g. Help me stay organized, provide emotional support..."
                    value={formData.expectations}
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 dark:text-white transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Sparkles size={14} />
                  Step 3: Communication
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Fine-tune the vibe.</h2>
                <p className="text-gray-500 dark:text-gray-400">How should Serani talk to you?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {styles.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setFormData(prev => ({ ...prev, communicationStyle: s.id }))}
                    className={`p-4 rounded-2xl text-left border-2 transition-all ${
                      formData.communicationStyle === s.id
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                        : "border-gray-100 dark:border-gray-800 hover:border-blue-200"
                    }`}
                  >
                    <div className="font-bold text-gray-900 dark:text-white">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between gap-4">
            {step > 1 ? (
              <button 
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button 
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !formData.profession) || 
                  (step === 2 && (!formData.goals || !formData.expectations))
                }
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                {loading ? "Saving..." : "Start Chatting"}
                {!loading && <Sparkles size={18} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingForm;

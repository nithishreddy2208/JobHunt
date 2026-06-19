import mongoose from 'mongoose';

// Pre-screening answers captured by the AI Application Assistant at apply time.
// All fields are optional so existing applications (and clients that skip
// screening) remain valid.
const screeningSchema = new mongoose.Schema({
    candidateType: { type: String, enum: ['fresher', 'experienced'], default: null },
    // Experienced
    experienceYears: { type: String, default: '' },
    relevantExperience: { type: String, default: '' },
    currentCompany: { type: String, default: '' },
    currentCTC: { type: String, default: '' },
    expectedCTC: { type: String, default: '' },
    noticePeriod: { type: String, default: '' },
    currentLocation: { type: String, default: '' },
    teamSize: { type: String, default: '' },
    largestProject: { type: String, default: '' },
    workAuthorization: { type: String, default: '' },
    reasonForChange: { type: String, default: '' },
    secondarySkills: { type: [String], default: [] },
    // Fresher
    graduationYear: { type: String, default: '' },
    college: { type: String, default: '' },
    degree: { type: String, default: '' },
    cgpa: { type: String, default: '' },
    internshipExperience: { type: String, default: '' },
    preferredStack: { type: String, default: '' },
    // Shared
    skills: { type: [String], default: [] },
    preferredLocation: { type: String, default: '' },
    relocation: { type: Boolean, default: null },
    expectedSalary: { type: String, default: '' },
    experienceSummary: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    whyHire: { type: String, default: '' },
    // Full ordered transcript for recruiter review.
    answers: {
        type: [{
            question: { type: String, default: '' },
            answer: { type: String, default: '' }
        }],
        default: []
    },
    // AI assessment (graceful: null when AI is unavailable).
    aiMatchScore: { type: Number, default: null },
    aiMatchSummary: { type: String, default: '' },
    completedAt: { type: Date, default: null }
}, { _id: false });

const applicationSchema= new mongoose.Schema({
    job:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Job',
        required:true
    },
    applicant:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    status:{
        type:String,
        enum:['pending','shortlisted','accepted','declined'],
        default:'pending'
    },
    screening: {
        type: screeningSchema,
        default: null
    }
},{timestamps:true});

export const Application=mongoose.model('Application',applicationSchema);
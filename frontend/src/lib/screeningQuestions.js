/**
 * Static question definitions for the AI Application Assistant (pre-screening).
 *
 * Kept in the frontend so opening the apply modal needs zero API calls. The
 * backend independently whitelists/validates whatever is submitted, so these
 * can evolve without server changes.
 *
 * Question shape:
 *   { key, label, type, options?, placeholder?, optional? }
 *   type: 'text' | 'number' | 'textarea' | 'yesno' | 'tags'
 *   - tags: comma/enter separated -> string[] on submit
 */

export const CANDIDATE_TYPE_QUESTION = {
  key: 'candidateType',
  label: 'To get started — are you a fresher or an experienced candidate?',
  type: 'choice',
  options: [
    { value: 'fresher', label: 'Fresher' },
    { value: 'experienced', label: 'Experienced' }
  ]
};

export const FRESHER_QUESTIONS = [
  { key: 'graduationYear', label: 'Which year did you (or will you) graduate?', type: 'number', placeholder: 'e.g. 2025' },
  { key: 'college', label: 'What is your college / university name?', type: 'text', placeholder: 'e.g. NIT Warangal' },
  { key: 'degree', label: 'What degree are you pursuing / completed?', type: 'text', placeholder: 'e.g. B.Tech Computer Science' },
  { key: 'cgpa', label: 'What is your CGPA / percentage?', type: 'text', placeholder: 'e.g. 8.4 / 10' },
  { key: 'internshipExperience', label: 'Tell us about any internship experience.', type: 'textarea', placeholder: 'Company, role, duration, what you built…', optional: true },
  { key: 'skills', label: 'What are your technical skills?', type: 'tags', placeholder: 'Type a skill and press Enter' },
  { key: 'preferredStack', label: 'What is your preferred technology stack?', type: 'text', placeholder: 'e.g. MERN, Java + Spring' },
  { key: 'preferredLocation', label: 'What is your preferred work location?', type: 'text', placeholder: 'e.g. Hyderabad' },
  { key: 'relocation', label: 'Are you willing to relocate?', type: 'yesno' },
  { key: 'expectedSalary', label: 'What is your expected salary?', type: 'text', placeholder: 'e.g. 6 LPA' },
  { key: 'portfolio', label: 'Share your portfolio link (optional).', type: 'text', placeholder: 'https://…', optional: true },
  { key: 'github', label: 'Share your GitHub link (optional).', type: 'text', placeholder: 'https://github.com/…', optional: true },
  { key: 'linkedin', label: 'Share your LinkedIn link (optional).', type: 'text', placeholder: 'https://linkedin.com/in/…', optional: true },
  { key: 'whyHire', label: 'Why should we hire you?', type: 'textarea', placeholder: 'A few sentences on your strengths…' }
];

export const EXPERIENCED_QUESTIONS = [
  { key: 'experienceYears', label: 'How many total years of experience do you have?', type: 'text', placeholder: 'e.g. 4 years' },
  { key: 'relevantExperience', label: 'How many years are relevant to this role?', type: 'text', placeholder: 'e.g. 3 years' },
  { key: 'currentCompany', label: 'What is your current company?', type: 'text', placeholder: 'e.g. ZapCom' },
  { key: 'currentCTC', label: 'What is your current CTC?', type: 'text', placeholder: 'e.g. 18 LPA' },
  { key: 'expectedCTC', label: 'What is your expected CTC?', type: 'text', placeholder: 'e.g. 24 LPA' },
  { key: 'noticePeriod', label: 'What is your notice period?', type: 'text', placeholder: 'e.g. 30 days' },
  { key: 'currentLocation', label: 'What is your current location?', type: 'text', placeholder: 'e.g. Bengaluru' },
  { key: 'preferredLocation', label: 'What is your preferred work location?', type: 'text', placeholder: 'e.g. Hyderabad / Remote' },
  { key: 'skills', label: 'What are your primary skills?', type: 'tags', placeholder: 'Type a skill and press Enter' },
  { key: 'secondarySkills', label: 'What are your secondary skills?', type: 'tags', placeholder: 'Type a skill and press Enter', optional: true },
  { key: 'experienceSummary', label: 'Give a short summary of your experience.', type: 'textarea', placeholder: 'Roles, domains, key achievements…' },
  { key: 'largestProject', label: 'What is the largest project you have worked on?', type: 'textarea', placeholder: 'Scope, your role, impact…' },
  { key: 'teamSize', label: 'What was your team size?', type: 'text', placeholder: 'e.g. 8' },
  { key: 'workAuthorization', label: 'What is your work authorization status?', type: 'text', placeholder: 'e.g. Indian citizen / H1B' },
  { key: 'reasonForChange', label: 'Why are you looking for a change?', type: 'textarea', placeholder: 'Be honest and concise…' }
];

export const getQuestionsFor = (candidateType) =>
  candidateType === 'fresher' ? FRESHER_QUESTIONS : candidateType === 'experienced' ? EXPERIENCED_QUESTIONS : [];

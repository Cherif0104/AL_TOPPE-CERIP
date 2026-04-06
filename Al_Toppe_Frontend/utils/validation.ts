export const validatePhone = (phone: string): boolean => {
  // Senegalese phone number validation
  const phoneRegex = /^(\+221|221)?[0-9]{9}$/;
  const cleaned = phone.replace(/\s/g, '');
  return phoneRegex.test(cleaned);
};

export const validateCNI = (cni: string): boolean => {
  // Senegalese CNI validation (13 digits)
  const cniRegex = /^[0-9]{1}\s[0-9]{3}\s[0-9]{3}\s[0-9]{3}\s[0-9]{2}\s[0-9]{5}$/;
  return cniRegex.test(cni);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Le mot de passe doit contenir au moins 6 caractères');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateAmount = (amount: string): boolean => {
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && numAmount > 0;
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const validateBusinessPlan = (plan: any): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!plan.title || plan.title.trim().length < 3) {
    errors.push('Le titre doit contenir au moins 3 caractères');
  }
  
  if (!plan.description || plan.description.trim().length < 10) {
    errors.push('La description doit contenir au moins 10 caractères');
  }
  
  if (!plan.targetMarket || plan.targetMarket.trim().length < 5) {
    errors.push('Le marché cible doit être défini');
  }
  
  if (!plan.investmentAmount || plan.investmentAmount <= 0) {
    errors.push('Le montant d\'investissement doit être positif');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
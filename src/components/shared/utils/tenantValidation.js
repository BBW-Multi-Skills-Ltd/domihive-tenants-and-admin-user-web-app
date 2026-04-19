const hasText = (value) => String(value ?? '').trim().length > 0;

const normalizeDigits = (value) => String(value ?? '').replace(/\D/g, '');

export const isValidEmail = (value) => {
  const email = String(value ?? '').trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPhone = (value) => {
  const digits = normalizeDigits(value);
  return digits.length >= 10 && digits.length <= 15;
};

export const isValidDateDDMMYYYY = (value) => {
  const text = String(value ?? '').trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || year < 1900) return false;
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
};

export const isValidISODateInput = (value) => {
  const text = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(text);
  return !Number.isNaN(date.getTime());
};

export const isValidCardNumber = (value) => normalizeDigits(value).length === 16;

export const isValidCardHolderName = (value) => String(value ?? '').trim().length >= 3;

export const isValidExpiryMMYY = (value) => {
  const text = String(value ?? '').trim();
  const match = /^(\d{2})\/(\d{2})$/.exec(text);
  if (!match) return false;
  const month = Number(match[1]);
  const year = Number(match[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
};

export const isValidCVV = (value) => /^\d{3}$/.test(String(value ?? '').trim());

export const validateBookInspection = ({ formValues, agreeTerms }) => {
  const errors = {};
  if (!hasText(formValues?.inspectionDate)) errors.inspectionDate = 'Select an inspection date.';
  if (!hasText(formValues?.inspectionTime)) errors.inspectionTime = 'Select an inspection time.';
  if (!hasText(formValues?.numberOfPeople)) errors.numberOfPeople = 'Select number of attendees.';
  if (!agreeTerms) errors.terms = 'You must agree to the terms before booking.';
  return errors;
};

export const validateApplicationProfile = (formData = {}) => {
  const errors = {};

  if (!hasText(formData.fullName)) errors.fullName = 'Full name is required.';
  if (!hasText(formData.email)) errors.email = 'Email is required.';
  else if (!isValidEmail(formData.email)) errors.email = 'Enter a valid email address.';

  if (!hasText(formData.phone)) errors.phone = 'Phone number is required.';
  else if (!isValidPhone(formData.phone)) errors.phone = 'Enter a valid phone number.';

  if (!hasText(formData.dateOfBirth)) errors.dateOfBirth = 'Date of birth is required.';
  else if (!isValidISODateInput(formData.dateOfBirth))
    errors.dateOfBirth = 'Use a valid date.';

  if (!hasText(formData.sex)) errors.sex = 'Sex is required.';
  if (!hasText(formData.occupation)) errors.occupation = 'Occupation is required.';
  if (!hasText(formData.maritalStatus)) errors.maritalStatus = 'Marital status is required.';
  if (!hasText(formData.occupants)) errors.occupants = 'Occupancy selection is required.';

  if (!hasText(formData.emergencyName)) errors.emergencyName = 'Emergency contact name is required.';
  if (!hasText(formData.emergencyPhone)) errors.emergencyPhone = 'Emergency contact phone is required.';
  else if (!isValidPhone(formData.emergencyPhone))
    errors.emergencyPhone = 'Enter a valid emergency phone number.';
  if (!hasText(formData.emergencyRelationship))
    errors.emergencyRelationship = 'Emergency relationship is required.';
  if (hasText(formData.emergencyEmail) && !isValidEmail(formData.emergencyEmail))
    errors.emergencyEmail = 'Enter a valid emergency email.';

  return errors;
};

export const validateApplicationDocument = (docs = {}) => {
  const errors = {};
  if (!hasText(docs.governmentIdFileName))
    errors.governmentIdFileName = 'Upload a valid government ID file.';
  return errors;
};

export const validateCardPayment = (cardInfo = {}) => {
  const errors = {};
  if (!isValidCardNumber(cardInfo.number)) errors.cardNumber = 'Enter a valid 16-digit card number.';
  if (!isValidCardHolderName(cardInfo.holder))
    errors.cardHolder = 'Card holder name must be at least 3 characters.';
  if (!isValidExpiryMMYY(cardInfo.expiry)) errors.expiry = 'Enter a valid future expiry (MM/YY).';
  if (!isValidCVV(cardInfo.cvv)) errors.cvv = 'Enter a valid 3-digit CVV.';
  return errors;
};

export const validateBankTransferPayment = ({ receiptFile }) => {
  const errors = {};
  if (!receiptFile) errors.receipt = 'Upload transfer receipt before proceeding.';
  return errors;
};

export const validateMaintenanceRequest = ({ form = {}, policyAgreed = false }) => {
  const errors = {};
  if (!hasText(form.propertyId)) errors.propertyId = 'Property context is required.';
  if (!hasText(form.title)) errors.title = 'Issue title is required.';
  if (!hasText(form.category)) errors.category = 'Category is required.';
  if (!hasText(form.urgency)) errors.urgency = 'Urgency level is required.';
  if (!hasText(form.description)) errors.description = 'Detailed description is required.';
  if (!hasText(form.contactPhone)) errors.contactPhone = 'Contact phone is required.';
  else if (!isValidPhone(form.contactPhone)) errors.contactPhone = 'Enter a valid contact phone.';
  if (!policyAgreed) errors.policyAgreed = 'You must agree to the maintenance policy.';
  return errors;
};

export const validateMoveInChecklist = ({ keyNumber, moveInDate }) => {
  const errors = {};
  if (!hasText(keyNumber)) errors.keyNumber = 'Key number is required.';
  if (!hasText(moveInDate)) errors.moveInDate = 'Move-in date is required.';
  else if (!isValidDateDDMMYYYY(moveInDate))
    errors.moveInDate = 'Use valid date format dd/mm/yyyy.';
  return errors;
};

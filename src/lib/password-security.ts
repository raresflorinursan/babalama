const PASSWORD_MIN_LENGTH = 10;

export function validatePassword(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein.`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "Das Passwort braucht Groß- und Kleinbuchstaben.";
  }
  if (!/\d/.test(password)) {
    return "Das Passwort braucht mindestens eine Zahl.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Das Passwort braucht mindestens ein Sonderzeichen.";
  }
  return null;
}

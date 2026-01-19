function normalizePhone(input) {
  if (!input) return null

  // Remove spaces, hyphens, brackets
  let phone = input.replace(/[\s\-()]/g, "")

  // Remove leading 0
  if (phone.startsWith("0")) {
    phone = phone.slice(1)
  }

  // If starts with 91 but no +
  if (phone.startsWith("91") && phone.length === 12) {
    phone = "+" + phone
  }

  // If 10-digit number
  if (/^\d{10}$/.test(phone)) {
    phone = "+91" + phone
  }

  // Final validation
  if (!/^\+91\d{10}$/.test(phone)) {
    return null
  }

  return phone
}

module.exports = normalizePhone

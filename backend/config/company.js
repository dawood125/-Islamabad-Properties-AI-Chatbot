// ============================================================
// COMPANY CONFIG — Change this for each client!
// Nick can swap this for any real estate company
// ============================================================

const company = {
  name: "Prime Islamabad Realty",
  shortName: "Prime Realty",
  tagline: "Your Trusted Property Partner in Islamabad",
  phone: "+92 300 1234567",
  whatsapp: "+92 300 1234567",
  email: "info@primerealty.pk",
  website: "www.primerealty.pk",
  address: "Office 301, Blue Area, Jinnah Avenue, Islamabad",
  logo: "🏢",

  // Agents for this company
  agents: [
    {
      id: 1,
      name: "Ahmed Ali",
      role: "Senior Property Consultant",
      specialization: "DHA & G-13",
      phone: "+92 316 1234567",
      whatsapp: "+92 316 1234567",
      available: true,
    },
    {
      id: 2,
      name: "Faisal Khan",
      role: "Premium Properties Manager",
      specialization: "F-Sectors & I-Sectors",
      phone: "+92 300 9876543",
      whatsapp: "+92 300 9876543",
      available: true,
    },
    {
      id: 3,
      name: "Hassan Raza",
      role: "Bahria Town Specialist",
      specialization: "Bahria Town & Bahria Enclave",
      phone: "+92 333 4567890",
      whatsapp: "+92 333 4567890",
      available: true,
    },
    {
      id: 4,
      name: "Sana Malik",
      role: "Rentals & Apartments Head",
      specialization: "Rentals, E-11, Apartments",
      phone: "+92 321 6543210",
      whatsapp: "+92 321 6543210",
      available: true,
    },
  ],

  // Working hours
  workingHours: "Monday - Saturday, 9:00 AM - 7:00 PM",

  // Social media
  social: {
    facebook: "facebook.com/primerealty",
    instagram: "@primerealty.pk",
    youtube: "Prime Islamabad Realty",
  },
};

module.exports = { company };
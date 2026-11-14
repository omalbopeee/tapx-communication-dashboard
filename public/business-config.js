// Public demo configuration. Run npm run build after changes.
export default {
  name: "TapX", displayName: "TapX", category: "Communication Demo",
  language: "en", logo: "tapx-demo.webp", logoAlt: "TapX demo wordmark",
  mobile: { enabled: true, number: "+94707703333", display: "070 770 3333", label: "Contact TapX" },
  whatsapp: { enabled: true, number: "+94707703333", display: "070 770 3333", message: "Hello TapX, I would like to know more about your NFC/QR communication stand." },
  fax: { enabled: false, number: "", display: "" },
  email: { enabled: true, address: "demo@example.com", demo: true },
  bank: { enabled: true, buttonText: "Bank Details", accounts: [
    { bankName: "Demo Bank", accountName: "DEMO ONLY — DO NOT PAY", accountNumber: "0000000000", branch: "Sample Branch", branchCode: "" }
  ] },
  location: { enabled: true, demo: true, url: "", text: "Location Demo" },
  review: { enabled: true, url: "https://tapx.lk/", text: "Google Review Demo" },
  social: { enabled: true, links: [
    { platform: "facebook", label: "Facebook", url: "", enabled: true, demo: true },
    { platform: "instagram", label: "Instagram", url: "", enabled: true, demo: true },
    { platform: "tiktok", label: "TikTok", url: "", enabled: true, demo: true }
  ] },
  website: { enabled: true, url: "https://tapx.lk/" },
  contactFilename: "TapX.vcf",
  hours: { enabled: false },
  seo: {
    // Replace with the actual demo URL after deploying. Contact always saves tapx.lk.
    siteUrl: "https://demo.communication.tapx.lk/",
    title: "TapX Communication Demo | NFC & QR Contact Hub",
    description: "Explore the TapX communication stand demo: WhatsApp, save contact, bank details, social media and more.",
    indexable: false, image: "og-demo.png", imageAlt: "TapX Communication Demo", imageWidth: 1200, imageHeight: 630, locale: "en_LK"
  },
  tapx: { website: "https://tapx.lk/", copyright: "© 2026 TapX | Communication Demo" },
  redirect: { enabled: true, fromHost: "tapx-demo-communication.tapxsrilanka.workers.dev", toOrigin: "https://communication.demo.tapx.lk/", status: 302 }
};

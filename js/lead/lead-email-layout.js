/**
 * Mise en forme des e-mails de notification lead (objet, corps texte / HTML).
 * Les libellés et sections sont centralisés ici pour personnalisation par marque.
 */
(function (global) {
  var LAYOUT = {
    subjectPrefix: "Nouveau lead simulateur primes",
    introLine: "Un visiteur a complété le simulateur et souhaite consulter son estimation.",
    sections: {
      contact: "Coordonnées",
      simulation: "Données de simulation",
      projects: "Projets de travaux",
      results: "Estimation calculée",
    },
    labels: {
      lastName: "Nom",
      firstName: "Prénom",
      email: "E-mail",
      phone: "Téléphone",
      consent: "Accepte d’être recontacté",
      postalCode: "Code postal",
      city: "Ville",
      household: "Personnes dans le foyer",
      incomeCategory: "Tranche de revenus",
      housingType: "Type de logement",
      status: "Statut",
      constructionYear: "Année de construction",
      surfaceARenover: "Surface à rénover (m²)",
      heatingBefore: "Chauffage avant travaux",
      maprimeTotal: "Total MaPrimeRénov’ estimé",
      ceeTotal: "Total CEE estimé",
      workType: "Type de travaux",
      quantity: "Quantité / surface",
    },
    yesNo: { true: "Oui", false: "Non" },
  };

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function line(label, value) {
    return label + " : " + (value == null || value === "" ? "—" : String(value));
  }

  function rowHtml(label, value) {
    return (
      "<tr><th align=\"left\" style=\"padding:6px 12px 6px 0;vertical-align:top;\">" +
      escapeHtml(label) +
      "</th><td style=\"padding:6px 0;\">" +
      escapeHtml(value == null || value === "" ? "—" : String(value)) +
      "</td></tr>"
    );
  }

  /**
   * @param {object} brand - window.SIMULATOR_BRAND
   * @param {object} lead - { lastName, firstName, email, phone, consent }
   * @param {object} simulation - résumé lisible + champs bruts
   * @returns {{ subject: string, textBody: string, htmlBody: string, formFields: object }}
   */
  function buildLeadEmailContent(brand, lead, simulation) {
    var prefix = (brand && brand.leadEmailSubjectPrefix) || LAYOUT.subjectPrefix;
    var subject =
      prefix +
      " — " +
      [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();

    var contactLines = [
      line(LAYOUT.labels.lastName, lead.lastName),
      line(LAYOUT.labels.firstName, lead.firstName),
      line(LAYOUT.labels.email, lead.email),
      line(LAYOUT.labels.phone, lead.phone),
      line(LAYOUT.labels.consent, LAYOUT.yesNo[!!lead.consent]),
    ];

    var simLines = (simulation.summaryLines || []).slice();

    var projectLines = (simulation.projectLines || []).map(function (p, i) {
      return (i + 1) + ". " + p;
    });

    var resultLines = simulation.resultLines || [];

    var textParts = [
      LAYOUT.introLine,
      "",
      "—— " + LAYOUT.sections.contact + " ——",
      contactLines.join("\n"),
      "",
      "—— " + LAYOUT.sections.simulation + " ——",
      simLines.join("\n"),
    ];

    if (projectLines.length) {
      textParts.push("", "—— " + LAYOUT.sections.projects + " ——", projectLines.join("\n"));
    }
    if (resultLines.length) {
      textParts.push("", "—— " + LAYOUT.sections.results + " ——", resultLines.join("\n"));
    }

    if (brand && brand.leadNotificationEmail) {
      textParts.push("", "Destinataire marque : " + brand.leadNotificationEmail);
    }

    var textBody = textParts.join("\n");

    var htmlParts = [
      "<p style=\"font-family:sans-serif;font-size:14px;\">" + escapeHtml(LAYOUT.introLine) + "</p>",
      "<h2 style=\"font-family:sans-serif;font-size:16px;\">" + escapeHtml(LAYOUT.sections.contact) + "</h2>",
      "<table style=\"font-family:sans-serif;font-size:14px;border-collapse:collapse;\">",
      rowHtml(LAYOUT.labels.lastName, lead.lastName),
      rowHtml(LAYOUT.labels.firstName, lead.firstName),
      rowHtml(LAYOUT.labels.email, lead.email),
      rowHtml(LAYOUT.labels.phone, lead.phone),
      rowHtml(LAYOUT.labels.consent, LAYOUT.yesNo[!!lead.consent]),
      "</table>",
      "<h2 style=\"font-family:sans-serif;font-size:16px;\">" + escapeHtml(LAYOUT.sections.simulation) + "</h2>",
      "<table style=\"font-family:sans-serif;font-size:14px;border-collapse:collapse;\">",
    ];

    (simulation.summaryRows || []).forEach(function (r) {
      htmlParts.push(rowHtml(r.label, r.value));
    });
    htmlParts.push("</table>");

    if (projectLines.length) {
      htmlParts.push(
        "<h2 style=\"font-family:sans-serif;font-size:16px;\">" + escapeHtml(LAYOUT.sections.projects) + "</h2>",
        "<ul style=\"font-family:sans-serif;font-size:14px;\">"
      );
      projectLines.forEach(function (pl) {
        htmlParts.push("<li>" + escapeHtml(pl) + "</li>");
      });
      htmlParts.push("</ul>");
    }

    if (resultLines.length) {
      htmlParts.push(
        "<h2 style=\"font-family:sans-serif;font-size:16px;\">" + escapeHtml(LAYOUT.sections.results) + "</h2>",
        "<table style=\"font-family:sans-serif;font-size:14px;border-collapse:collapse;\">"
      );
      (simulation.resultRows || []).forEach(function (r) {
        htmlParts.push(rowHtml(r.label, r.value));
      });
      htmlParts.push("</table>");
    }

    var htmlBody = htmlParts.join("");

    var formFields = {
      _subject: subject,
      name: [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim(),
      email: lead.email,
      phone: lead.phone,
      message: textBody,
      _replyto: lead.email,
    };

    return {
      subject: subject,
      textBody: textBody,
      htmlBody: htmlBody,
      formFields: formFields,
    };
  }

  global.LEAD_EMAIL_LAYOUT = LAYOUT;
  global.buildSimulatorLeadEmailContent = buildLeadEmailContent;
})(typeof window !== "undefined" ? window : globalThis);

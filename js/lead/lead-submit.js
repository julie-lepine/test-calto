/**
 * Envoi de la notification lead vers l’e-mail configuré dans SIMULATOR_BRAND.leadNotificationEmail.
 * Par défaut : FormSubmit (https://formsubmit.co) — aucun backend requis ; une confirmation
 * par e-mail peut être demandée une fois par adresse destinataire.
 * Alternative : SIMULATOR_BRAND.leadSubmitEndpoint (POST JSON).
 */
(function (global) {
  /**
   * @param {object} brand - window.SIMULATOR_BRAND
   * @param {object} emailContent - sortie de buildSimulatorLeadEmailContent
   * @returns {Promise<void>}
   */
  function sendLeadNotification(brand, emailContent) {
    var to = brand && brand.leadNotificationEmail ? String(brand.leadNotificationEmail).trim() : "";
    if (!to) {
      return Promise.reject(
        new Error("leadNotificationEmail manquant dans SIMULATOR_BRAND (brand-config.js).")
      );
    }

    var customEndpoint =
      brand && brand.leadSubmitEndpoint ? String(brand.leadSubmitEndpoint).trim() : "";

    if (customEndpoint) {
      return fetch(customEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          to: to,
          subject: emailContent.subject,
          textBody: emailContent.textBody,
          htmlBody: emailContent.htmlBody,
          formFields: emailContent.formFields,
        }),
      }).then(function (res) {
        if (!res.ok) {
          return res.text().then(function (t) {
            throw new Error(t || "Échec de l’envoi du lead (endpoint personnalisé).");
          });
        }
      });
    }

    var payload = Object.assign({}, emailContent.formFields, {
      _captcha: "false",
      _template: "box",
    });

    return fetch("https://formsubmit.co/ajax/" + encodeURIComponent(to), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || (data && data.success === false)) {
          var msg =
            (data && data.message) ||
            "Impossible d’envoyer la notification lead. Vérifiez leadNotificationEmail et FormSubmit.";
          throw new Error(msg);
        }
      });
    });
  }

  global.sendSimulatorLeadNotification = sendLeadNotification;
})(typeof window !== "undefined" ? window : globalThis);


// DOM Elements
const inputText = document.getElementById('inputText');
const outputDiv = document.getElementById('output');
const resultContainer = document.getElementById('resultContainer');
const summaryBtn = document.getElementById('summaryBtn');
const highlightBtn = document.getElementById('highlightBtn');
const qaBtn = document.getElementById('qaBtn');
const pdfBtn = document.getElementById('pdfBtn');
const copyBtn = document.getElementById('copyBtn');

// Helper Lists
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
]);

// Helper Functions
function getSentences(text) {
  // Simple regex for sentence splitting ensuring we don't split on abbreviations like "Dr." or "vs." too easily
  return text.match( /[^\.!\?]+[\.!\?]+/g ) || [text];
}

function getWords(text) {
  return text.toLowerCase().match(/\b\w+\b/g) || [];
}

function getKeywords(text) {
  const words = getWords(text);
  const freq = {};
  words.forEach(w => {
    if (!STOP_WORDS.has(w) && w.length > 2 && !/^\d+$/.test(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  });
  
  // Sort by frequency
  return Object.keys(freq).sort((a,b) => freq[b] - freq[a]);
}

// Logic Implementations
function generateOfflineSummary(text) {
  const sentences = getSentences(text);
  if (sentences.length < 3) return text; // Too short to summarize

  const keywords = getKeywords(text);
  // Take top 20% keywords
  const topKeywords = new Set(keywords.slice(0, Math.ceil(keywords.length * 0.2)));

  // Score sentences based on keyword overlap
  const scores = sentences.map((s, i) => {
    const sWords = getWords(s);
    let score = 0;
    sWords.forEach(w => {
      if (topKeywords.has(w)) score++;
    });
    // Normalize by length so short sentences aren't unfairly penalized or favored too much
    return { index: i, text: s, score: score / (sWords.length || 1) }; 
  });

  // Sort by score and pick top 3 or 30%, whichever is larger
  const count = Math.max(3, Math.ceil(sentences.length * 0.3));
  const topSentences = scores.sort((a, b) => b.score - a.score).slice(0, count);

  // Sort back by original index to maintain flow
  topSentences.sort((a, b) => a.index - b.index);

  return "<b>Summary:</b><br><ul>" + topSentences.map(s => `<li>${s.text.trim()}</li>`).join('') + "</ul>";
}

function generateOfflineHighlight(text) {
  const keywords = getKeywords(text).slice(0, 10); // Top 10 keywords
  let highlightedText = text;

  // Use a placeholder to avoid replacing inside already replaced tags
  keywords.forEach(word => {
     // Case insensitive replace global
     const regex = new RegExp(`\\b(${word})\\b`, 'gi');
     highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
  });
  
  return highlightedText.replace(/\n/g, '<br>');
}

function generateOfflineQA(text) {
  const type = document.getElementById('qaType').value || 'short answer';
  const keywords = getKeywords(text).slice(0, 5); // Start with top keywords
  const sentences = getSentences(text);
  
  if (keywords.length === 0) return "Not enough content to generate questions.";

  let content = `<b>${type.toUpperCase()} Questions:</b><br><br>`;
  
  keywords.forEach((word, i) => {
    // Find a context sentence
    const context = sentences.find(s => s.toLowerCase().includes(word));
    if (!context) return;
    
    const contextClean = context.trim();

    if (type === 'multiple choice') {
        content += `<b>Q${i+1}:</b> Which concept is related to: "${contextClean.substring(0, 40)}..."?<br>`;
        content += `A) ${word} <br> B) ${keywords[(i+1)%keywords.length]} <br> C) ${keywords[(i+2)%keywords.length]}<br><br>`;
    } else if (type === 'essay') {
        content += `<b>Q${i+1}:</b> Discuss the significance of "<b>${word}</b>" in the context of the text provided.<br><br>`;
    } else {
        // Short Answer
        content += `<b>Q${i+1}:</b> What is the role of "<b>${word}</b>" described in the text?<br>`;
        content += `<i>Context: ${contextClean}</i><br><br>`;
    }
  });
  
  return content;
}

// Handler
function handleAction(type) {
  const text = inputText.value.trim();
  if (!text) {
    showResult('Please enter some text first.', true);
    return;
  }
  
  showLoader();
  
  // Simulate processing delay for better UX
  setTimeout(() => {
    let result = '';
    try {
        switch (type) {
            case 'summary':
              result = generateOfflineSummary(text);
              break;
            case 'highlight':
              result = generateOfflineHighlight(text);
              break;
            case 'qa':
              result = generateOfflineQA(text);
              break;
          }
          showResult(result);
    } catch (e) {
        showResult('Error processing text: ' + e.message, true);
    }
  }, 500);
}

// Event Listeners
summaryBtn.addEventListener('click', () => handleAction('summary'));
highlightBtn.addEventListener('click', () => handleAction('highlight'));
qaBtn.addEventListener('click', () => handleAction('qa'));
pdfBtn.addEventListener('click', downloadPDF);
copyBtn.addEventListener('click', copyToClipboard);

// Helpers
function showLoader() {
  resultContainer.style.display = 'block';
  outputDiv.innerHTML = '<div class="loader"></div> Processing...';
}

function showResult(html, isError = false) {
  resultContainer.style.display = 'block';
  
  if (isError) {
    outputDiv.innerHTML = `<span style="color: #ef4444;">${html}</span>`;
  } else {
    outputDiv.innerHTML = html;
  }
}

function downloadPDF() {
  const content = outputDiv.innerText;
  if (!content) {
    alert('No content to download!');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const splitText = doc.splitTextToSize(content, 180);
  doc.text(splitText, 15, 15);
  doc.save('study-notes.pdf');
}

async function copyToClipboard() {
  const text = outputDiv.innerText;
  try {
    await navigator.clipboard.writeText(text);
    const originalText = copyBtn.innerText;
    copyBtn.innerText = 'Copied!';
    setTimeout(() => copyBtn.innerText = originalText, 2000);
  } catch (err) {
    console.error('Failed to copy', err);
  }
}

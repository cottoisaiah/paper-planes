import logger from '../utils/logger';

export interface PersonalityTraits {
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'humorous';
  expertise: 'beginner' | 'intermediate' | 'expert' | 'thought-leader';
  engagement: 'conservative' | 'moderate' | 'active' | 'aggressive';
  formality: 'formal' | 'semi-formal' | 'casual' | 'very-casual';
  perspective: 'helpful' | 'analytical' | 'creative' | 'critical' | 'supportive';
}

export interface PersonalityProfile {
  systemPromptAddition: string;
  responseStyle: string;
  engagementModifiers: {
    likeBoost: number;
    replyBoost: number;
    retweetBoost: number;
    quoteBoost: number;
  };
  vocabularyLevel: 'simple' | 'intermediate' | 'advanced' | 'expert';
  conversationStyle: string;
}

export class PersonalityService {
  
  /**
   * Generate a comprehensive personality profile from traits
   */
  static generatePersonalityProfile(traits: PersonalityTraits): PersonalityProfile {
    const profile: PersonalityProfile = {
      systemPromptAddition: this.buildSystemPromptAddition(traits),
      responseStyle: this.buildResponseStyle(traits),
      engagementModifiers: this.calculateEngagementModifiers(traits),
      vocabularyLevel: this.determineVocabularyLevel(traits),
      conversationStyle: this.buildConversationStyle(traits)
    };

    return profile;
  }

  /**
   * Build personality-specific system prompt additions
   */
  private static buildSystemPromptAddition(traits: PersonalityTraits): string {
    let prompt = '';

    // Tone-specific instructions
    switch (traits.tone) {
      case 'professional':
        prompt += 'Maintain a professional, polished tone. Use clear, direct language that demonstrates competence and reliability.';
        break;
      case 'casual':
        prompt += 'Use a relaxed, conversational tone. Be approachable and down-to-earth in your communication style.';
        break;
      case 'friendly':
        prompt += 'Adopt a warm, welcoming tone. Show genuine interest and be encouraging in your interactions.';
        break;
      case 'authoritative':
        prompt += 'Communicate with confidence and authority. Demonstrate deep knowledge and speak with conviction.';
        break;
      case 'humorous':
        prompt += 'Incorporate appropriate humor and wit. Be engaging and entertaining while remaining respectful.';
        break;
    }

    // Expertise-specific instructions
    switch (traits.expertise) {
      case 'beginner':
        prompt += ' Explain concepts clearly and avoid jargon. Ask thoughtful questions to learn from others.';
        break;
      case 'intermediate':
        prompt += ' Balance knowledge sharing with curiosity. Provide helpful insights while remaining open to learning.';
        break;
      case 'expert':
        prompt += ' Share deep insights and nuanced perspectives. Reference advanced concepts when appropriate.';
        break;
      case 'thought-leader':
        prompt += ' Offer innovative perspectives and forward-thinking insights. Connect trends and implications.';
        break;
    }

    // Perspective-specific instructions
    switch (traits.perspective) {
      case 'helpful':
        prompt += ' Focus on providing value and assistance. Offer practical solutions and support.';
        break;
      case 'analytical':
        prompt += ' Approach topics with logical analysis. Break down complex issues and examine multiple angles.';
        break;
      case 'creative':
        prompt += ' Bring creative and innovative thinking. Suggest unique approaches and novel solutions.';
        break;
      case 'critical':
        prompt += ' Provide thoughtful critique and constructive feedback. Challenge assumptions respectfully.';
        break;
      case 'supportive':
        prompt += ' Be encouraging and validating. Build others up and celebrate achievements.';
        break;
    }

    return prompt;
  }

  /**
   * Build response style guidelines
   */
  private static buildResponseStyle(traits: PersonalityTraits): string {
    let style = '';

    // Formality-specific style
    switch (traits.formality) {
      case 'formal':
        style += 'Use proper grammar, complete sentences, and formal vocabulary. Avoid contractions.';
        break;
      case 'semi-formal':
        style += 'Balance professionalism with approachability. Use clear, well-structured language.';
        break;
      case 'casual':
        style += 'Use natural, conversational language. Contractions and informal expressions are appropriate.';
        break;
      case 'very-casual':
        style += 'Adopt a very relaxed, informal style. Use colloquialisms and casual expressions naturally.';
        break;
    }

    return style;
  }

  /**
   * Calculate engagement probability modifiers based on personality
   */
  private static calculateEngagementModifiers(traits: PersonalityTraits): PersonalityProfile['engagementModifiers'] {
    const base = { likeBoost: 1.0, replyBoost: 1.0, retweetBoost: 1.0, quoteBoost: 1.0 };

    // Engagement level modifiers
    switch (traits.engagement) {
      case 'conservative':
        return { likeBoost: 0.8, replyBoost: 0.6, retweetBoost: 0.5, quoteBoost: 0.4 };
      case 'moderate':
        return { likeBoost: 1.0, replyBoost: 0.8, retweetBoost: 0.7, quoteBoost: 0.6 };
      case 'active':
        return { likeBoost: 1.2, replyBoost: 1.1, retweetBoost: 0.9, quoteBoost: 0.8 };
      case 'aggressive':
        return { likeBoost: 1.4, replyBoost: 1.3, retweetBoost: 1.1, quoteBoost: 1.0 };
    }

    return base;
  }

  /**
   * Determine vocabulary complexity level
   */
  private static determineVocabularyLevel(traits: PersonalityTraits): PersonalityProfile['vocabularyLevel'] {
    if (traits.expertise === 'beginner' || traits.formality === 'very-casual') {
      return 'simple';
    }
    if (traits.expertise === 'intermediate' || traits.formality === 'casual') {
      return 'intermediate';
    }
    if (traits.expertise === 'expert' || traits.formality === 'formal') {
      return 'advanced';
    }
    if (traits.expertise === 'thought-leader') {
      return 'expert';
    }
    return 'intermediate';
  }

  /**
   * Build conversation style description
   */
  private static buildConversationStyle(traits: PersonalityTraits): string {
    const styles = [];

    if (traits.tone === 'humorous') styles.push('witty');
    if (traits.tone === 'friendly') styles.push('warm');
    if (traits.tone === 'authoritative') styles.push('confident');
    if (traits.perspective === 'analytical') styles.push('logical');
    if (traits.perspective === 'creative') styles.push('innovative');
    if (traits.engagement === 'active') styles.push('engaging');
    if (traits.formality === 'casual') styles.push('relaxed');

    return styles.length > 0 ? styles.join(', ') : 'balanced';
  }

  /**
   * Generate personality-aware content prompt
   */
  static enhancePromptWithPersonality(basePrompt: string, traits: PersonalityTraits, context: string = ''): string {
    const profile = this.generatePersonalityProfile(traits);
    
    let enhancedPrompt = basePrompt;
    
    // Add personality context
    enhancedPrompt += `\n\nPersonality Guidelines: ${profile.systemPromptAddition}`;
    enhancedPrompt += `\nResponse Style: ${profile.responseStyle}`;
    enhancedPrompt += `\nConversation Style: Be ${profile.conversationStyle} in your communication.`;
    enhancedPrompt += `\nVocabulary Level: Use ${profile.vocabularyLevel}-level language.`;
    
    if (context) {
      enhancedPrompt += `\nContext: ${context}`;
    }

    return enhancedPrompt;
  }

  /**
   * Apply personality modifiers to engagement probabilities
   */
  static applyPersonalityToEngagement(
    baseProbabilities: { like: number; reply: number; retweet: number; quote: number },
    traits: PersonalityTraits
  ): { like: number; reply: number; retweet: number; quote: number } {
    const profile = this.generatePersonalityProfile(traits);
    const modifiers = profile.engagementModifiers;

    return {
      like: Math.round(baseProbabilities.like * modifiers.likeBoost),
      reply: Math.round(baseProbabilities.reply * modifiers.replyBoost),
      retweet: Math.round(baseProbabilities.retweet * modifiers.retweetBoost),
      quote: Math.round(baseProbabilities.quote * modifiers.quoteBoost)
    };
  }
}

export default PersonalityService;
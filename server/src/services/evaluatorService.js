import bcrypt from 'bcrypt';
import { createEvaluator, findByEmail } from '../model/evaluatorModel.js';

export const registerEvaluatorService = async (full_name, email, institution, designation, password) => {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const existingEvaluators = await findByEmail(normalizedEmail);

    if (existingEvaluators.length > 0) {
        throw new Error('Email already exists');
    }

    const hashed = await bcrypt.hash(password, 10);
    await createEvaluator(full_name.trim(), normalizedEmail, institution.trim(), designation.trim(), hashed);

    return 'Evaluator registered successfully';
};

export const loginEvaluatorService = async (email, password) => {
    // Normalize email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase().trim();
    const evaluators = await findByEmail(normalizedEmail);

    if (evaluators.length === 0) {
        console.log(`[loginEvaluatorService] No evaluator found with email: ${normalizedEmail}`);
        throw new Error('Invalid email or password');
    }

    const evaluator = evaluators[0];
    console.log(`[loginEvaluatorService] Found evaluator: ${evaluator.evaluator_id}, email: ${evaluator.email}`);
    
    // Check if password exists and is a valid hash
    if (!evaluator.password) {
        console.log(`[loginEvaluatorService] No password found for evaluator: ${evaluator.evaluator_id}`);
        throw new Error('Invalid email or password');
    }

    // Check if password is already hashed (starts with $2a$, $2b$, or $2y$)
    const isHashed = evaluator.password.startsWith('$2a$') || 
                     evaluator.password.startsWith('$2b$') || 
                     evaluator.password.startsWith('$2y$');

    console.log(`[loginEvaluatorService] Password is hashed: ${isHashed}, password length: ${evaluator.password?.length || 0}`);

    let isPasswordValid = false;
    
    if (isHashed) {
        // Password is hashed, use bcrypt.compare
        try {
            isPasswordValid = await bcrypt.compare(password, evaluator.password);
            console.log(`[loginEvaluatorService] Bcrypt comparison result: ${isPasswordValid}`);
        } catch (bcryptError) {
            console.error(`[loginEvaluatorService] Bcrypt comparison error:`, bcryptError);
            throw new Error('Invalid email or password');
        }
    } else {
        // Password is not hashed (shouldn't happen, but handle it)
        console.log(`[loginEvaluatorService] Warning: Password for evaluator ${evaluator.evaluator_id} is not hashed. This is a security issue!`);
        isPasswordValid = password === evaluator.password;
        console.log(`[loginEvaluatorService] Plain text comparison result: ${isPasswordValid}`);
    }

    if (!isPasswordValid) {
        console.log(`[loginEvaluatorService] Password mismatch for evaluator: ${evaluator.evaluator_id}`);
        throw new Error('Invalid email or password');
    }

    console.log(`[loginEvaluatorService] Login successful for evaluator: ${evaluator.evaluator_id}`);
    return {
        evaluator_id: evaluator.evaluator_id,
        full_name: evaluator.full_name,
        email: evaluator.email,
        institution: evaluator.institution,
        designation: evaluator.designation,
    };
};


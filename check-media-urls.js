#!/usr/bin/env node
const { supabase } = require('./db/supabase');

async function checkMediaUrls() {
  const { data } = await supabase
    .from('page_content')
    .select('*')
    .eq('page_id', 'inicio')
    .single();
  
  const media = ['hero-background', 'hero-image', 'hero-video', 'tarot-image', 'contact-video'];
  
  console.log('\n📸 URLs de Multimedia en inicio:\n');
  media.forEach(key => {
    console.log(`${key}:`);
    console.log(`  ${data.content[key] || '(no definido)'}\n`);
  });

  // Sobremi
  const { data: sobremi } = await supabase
    .from('page_content')
    .select('*')
    .eq('page_id', 'sobremi')
    .single();
  
  console.log('📸 URLs de Multimedia en sobremi:\n');
  console.log(`profile-image:`);
  console.log(`  ${sobremi.content['profile-image'] || '(no definido)'}\n`);
  
  process.exit(0);
}

checkMediaUrls();

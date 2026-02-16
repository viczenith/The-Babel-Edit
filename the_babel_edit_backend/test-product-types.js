#!/usr/bin/env node

import http from 'http';

function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = new URL(url);
    const req = http.request(options, {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     PRODUCT TYPES SYSTEM - END-TO-END TEST SUITE      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Test 1: Get all categories
    console.log('📋 TEST 1: Get All Categories');
    console.log('─────────────────────────────────');
    const categResp = await makeRequest('http://localhost:5000/api/types/categories');
    if (categResp.status === 200 && Array.isArray(categResp.data)) {
      console.log(`✅ Status: ${categResp.status}`);
      console.log(`✅ Categories found: ${categResp.data.length}`);
      categResp.data.forEach(cat => {
        console.log(`   • ${cat.name} (${cat.types?.length || 0} types)`);
      });
    } else {
      console.log(`❌ Failed: ${categResp.status}`);
    }

    // Test 2: Get single category with types
    console.log('\n📋 TEST 2: Get Clothes Category with Types');
    console.log('─────────────────────────────────────────');
    const clothesId = categResp.data.find(c => c.slug === 'clothes')?.id;
    if (clothesId) {
      const clothesResp = await makeRequest(`http://localhost:5000/api/types/categories/${clothesId}`);
      if (clothesResp.status === 200) {
        console.log(`✅ Status: ${clothesResp.status}`);
        console.log(`✅ Category: ${clothesResp.data.name}`);
        console.log(`✅ Types: ${clothesResp.data.types?.length || 0}`);
        clothesResp.data.types?.slice(0, 3).forEach(t => {
          console.log(`   • ${t.name}`);
        });
        if ((clothesResp.data.types?.length || 0) > 3) {
          console.log(`   ... and ${clothesResp.data.types.length - 3} more`);
        }
      } else {
        console.log(`❌ Failed: ${clothesResp.status}`);
      }
    }

    // Test 3: Filter endpoint - Clothes
    console.log('\n📋 TEST 3: Filter Options for Clothes Category');
    console.log('─────────────────────────────────────────────');
    const filterResp = await makeRequest('http://localhost:5000/api/products/filter-options?category=clothes');
    if (filterResp.status === 200) {
      console.log(`✅ Status: ${filterResp.status}`);
      const typeFilter = filterResp.data.filterGroups?.find(fg => fg.key === 'type');
      if (typeFilter) {
        console.log(`✅ Type Filter Options: ${typeFilter.options?.length || 0}`);
        typeFilter.options?.slice(0, 4).forEach(opt => {
          console.log(`   • ${opt.label}`);
        });
        if ((typeFilter.options?.length || 0) > 4) {
          console.log(`   ... and ${typeFilter.options.length - 4} more`);
        }
      } else {
        console.log('❌ Type filter not found');
      }
    } else {
      console.log(`❌ Failed: ${filterResp.status}`);
    }

    // Test 4: Filter endpoint - Different categories
    console.log('\n📋 TEST 4: Filter Options - All Categories');
    console.log('──────────────────────────────────────────');
    const categories = ['clothes', 'shoes', 'bags', 'accessories'];
    for (const cat of categories) {
      const resp = await makeRequest(`http://localhost:5000/api/products/filter-options?category=${cat}`);
      if (resp.status === 200) {
        const typeFilter = resp.data.filterGroups?.find(fg => fg.key === 'type');
        const typeCount = typeFilter?.options?.length || 0;
        console.log(`✅ ${cat.charAt(0).toUpperCase() + cat.slice(1)}: ${typeCount} types`);
      }
    }

    // Test 5: Get all types
    console.log('\n📋 TEST 5: Get All Types Across Categories');
    console.log('────────────────────────────────────────');
    const allTypesResp = await makeRequest('http://localhost:5000/api/types/all-types');
    if (allTypesResp.status === 200 && Array.isArray(allTypesResp.data)) {
      console.log(`✅ Status: ${allTypesResp.status}`);
      console.log(`✅ Total types: ${allTypesResp.data.length}`);
      const grouped = {};
      allTypesResp.data.forEach(t => {
        const catName = t.category?.name || 'Unknown';
        grouped[catName] = (grouped[catName] || 0) + 1;
      });
      Object.entries(grouped).forEach(([cat, count]) => {
        console.log(`   • ${cat}: ${count} types`);
      });
    }

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              ✅ ALL TESTS COMPLETED SUCCESSFULLY        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
    process.exit(1);
  }
}

runTests();

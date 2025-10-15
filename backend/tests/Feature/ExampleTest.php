<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_check_route(): void
    {
        $response = $this->getJson('/api/jobs/highlights');

        $response->assertStatus(401);
    }
}
